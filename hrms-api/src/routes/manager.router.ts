import path from "node:path";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  attendanceRecords,
  attendanceUploads,
  branches,
  orgHierarchyDepartments as departments,
  orgHierarchyDesignations as designations,
  orgHierarchyStructure,
  orgHierarchySubDepartments,
  employees,
  grades,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  regularisationRequests,
  resignations,
} from "@/db/schema/hrms";
import { shapeAttendanceReportRow, attendanceUploadToEmployeeJoin, type AttendanceReportShiftInfo } from "@/lib/attendance-report";
import { loadAttendanceDayContextBatch, buildMonthAttendanceFromUploads } from "@/lib/attendance-status";
import { resolveShiftsForEmployees } from "@/services/shift-resolver";
import {
  formatEmployeeFullName,
  loadCurrentManager,
  startEndOfMonth,
  todayYmd,
  ymd,
} from "@/lib/employee";
import { ApiError } from "@/middleware/error";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import {
  notifyEmployeeOnApproval,
  notifyEmployeeOnRejection,
  notifyHROnForward,
} from "@/services/leave-notifications";
import {
  loadLeaveRequestParticipants,
  requiresHRApprovalForEmployee,
} from "@/services/leave-routing";
import { fetchEmployeeLeaveBalances } from "@/services/leave-request-validation";
import { syncLeaveUsageOnTransition } from "@/services/leave-balance";
import {
  mapLeaveDocumentUrls,
  mimeTypeForLeaveDocument,
} from "@/lib/leave-document-urls";
import { openPrivateFileReadable } from "@/infrastructure/storage/private-file-storage";

export const managerRouter: Router = Router();

// Self-join alias to surface each report's reporting manager (Manager column).
const reportingMgr = alias(employees, "reporting_mgr");
const l3Mgr = alias(employees, "l3_mgr");
const structDept = alias(departments, "struct_dept");
const legacyDept = alias(departments, "legacy_dept");
const structSubDept = alias(orgHierarchySubDepartments, "struct_sub_dept");
const legacySubDept = alias(orgHierarchySubDepartments, "legacy_sub_dept");
const structDesignation = alias(designations, "struct_designation");
const legacyDesignation = alias(designations, "legacy_designation");
const locationBranch = alias(branches, "location_branch");
const fallbackBranch = alias(branches, "fallback_branch");

const teamAttendanceReportQuerySchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// ── helpers ─────────────────────────────────────────────────────────────────

async function leaveOwnedByManager(
  leaveId: number,
  managerId: number,
): Promise<boolean> {
  const rows = await db
    .select({
      managerId: leaveRequests.managerId,
      reportingManagerId: employees.reportingManagerId,
    })
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .where(eq(leaveRequests.id, leaveId))
    .limit(1);
  const r = rows[0];
  if (!r) return false;
  return r.managerId === managerId || r.reportingManagerId === managerId;
}

function capStatus(s: string): string {
  return (s[0]?.toUpperCase() ?? "") + s.slice(1);
}

// ── /me — manager's own profile and snapshots ───────────────────────────────
managerRouter.get("/me", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const [designation] = mgr.designationId
      ? await db.select({ name: designations.name }).from(designations)
          .where(eq(designations.id, mgr.designationId)).limit(1)
      : [];
    const [department] = mgr.departmentId
      ? await db.select({ name: departments.name }).from(departments)
          .where(eq(departments.id, mgr.departmentId)).limit(1)
      : [];
    const [grade] = mgr.gradeId
      ? await db.select({ code: grades.code }).from(grades)
          .where(eq(grades.id, mgr.gradeId)).limit(1)
      : [];
    const [branch] = mgr.branchId
      ? await db.select({ name: branches.name }).from(branches)
          .where(eq(branches.id, mgr.branchId)).limit(1)
      : [];
    res.json({
      id: mgr.id,
      empId: mgr.empId,
      firstName: mgr.firstName,
      lastName: mgr.lastName,
      fullName: `${mgr.firstName} ${mgr.lastName}`,
      initials: `${mgr.firstName[0] ?? ""}${mgr.lastName[0] ?? ""}`.toUpperCase(),
      avatarUrl: mgr.profilePhotoUrl ? `/api/me/profile-photo` : null,
      email: req.user!.email,
      personalEmail: mgr.personalEmail,
      workEmail: mgr.workEmail,
      phone: mgr.phone,
      role: designation?.name ?? null,
      department: department?.name ?? null,
      grade: grade?.code ?? null,
      branch: branch?.name ?? null,
      joiningDate: mgr.joiningDate,
    });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/me/attendance/today", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const today = todayYmd();
    const [row] = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, mgr.id),
        eq(attendanceRecords.date, today),
      ))
      .limit(1);
    res.json({ date: today, record: row ?? null });
  } catch (e) {
    next(e);
  }
});

const monthQuery = z.object({
  year: z.coerce.number().int().min(1970).max(9999).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

managerRouter.get("/me/attendance/month", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const now = new Date();
    const q = monthQuery.parse(req.query);
    const year = q.year ?? now.getFullYear();
    const month1 = q.month ?? now.getMonth() + 1;
    const { start, end } = startEndOfMonth(year, month1 - 1);
    const records = await buildMonthAttendanceFromUploads(
      mgr.id,
      mgr.empId,
      start,
      end,
    );
    res.json({ year, month: month1, records });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/me/leave-requests", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const rows = await db
      .select({
        id: leaveRequests.id,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        days: leaveRequests.days,
        durationType: leaveRequests.durationType,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        appliedOn: leaveRequests.appliedOn,
        managerDecidedAt: leaveRequests.managerDecidedAt,
        hrDecidedAt: leaveRequests.hrDecidedAt,
        createdAt: leaveRequests.createdAt,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.employeeId, mgr.id))
      .orderBy(desc(leaveRequests.appliedOn));
    res.json({ requests: rows });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/me/leave-balances", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const rows = await fetchEmployeeLeaveBalances(mgr.id);
    res.json({ balances: rows });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/me/regularisation-requests", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const rows = await db
      .select()
      .from(regularisationRequests)
      .where(eq(regularisationRequests.employeeId, mgr.id))
      .orderBy(desc(regularisationRequests.createdAt));
    res.json({ requests: rows });
  } catch (e) {
    next(e);
  }
});

const createRegSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedPunchIn: z.string().min(5),
  requestedPunchOut: z.string().min(5),
  reason: z.string().min(1).max(2000),
  originalIssue: z.string().max(255).optional(),
});

managerRouter.post("/me/regularisation-requests", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const body = createRegSchema.parse(req.body);
    if (body.date > todayYmd()) {
      throw new ApiError(400, "FUTURE_DATE", "Regularisation is only allowed for past or current dates.");
    }
    const [row] = await db
      .insert(regularisationRequests)
      .values({
        employeeId: mgr.id,
        date: body.date,
        originalIssue: body.originalIssue ?? null,
        requestedPunchIn: body.requestedPunchIn,
        requestedPunchOut: body.requestedPunchOut,
        reason: body.reason,
        status: "Pending",
      })
      .returning();
    res.status(201).json({ request: row });
  } catch (e) {
    next(e);
  }
});

// ── Team ────────────────────────────────────────────────────────────────────
managerRouter.get("/team", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const team = await db
      .select({
        id: employees.id,
        empId: employees.empId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: designations.name,
        grade: grades.code,
        dob: employees.dob,
        joiningDate: employees.joiningDate,
        profilePhotoUrl: employees.profilePhotoUrl,
      })
      .from(employees)
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(grades, eq(employees.gradeId, grades.id))
      .where(eq(employees.reportingManagerId, mgr.id))
      .orderBy(asc(employees.firstName));
    res.json({ team });
  } catch (e) {
    next(e);
  }
});

// ── GET /api/manager/team/attrition ────────────────────────────────────────
// Returns the number of approved resignations from the manager's team whose
// last_working_date falls within the given window (defaults to current month).
// Plus the team size, so the UI can compute a percentage.
managerRouter.get("/team/attrition", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const from = typeof req.query.from === "string"
      ? req.query.from
      : `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(monthStart.getDate()).padStart(2, "0")}`;
    const to = typeof req.query.to === "string"
      ? req.query.to
      : `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

    const teamRows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.reportingManagerId, mgr.id));
    const teamSize = teamRows.length;
    const teamIds = teamRows.map((r) => r.id);

    if (teamIds.length === 0) {
      res.json({ from, to, count: 0, teamSize: 0, percentage: 0 });
      return;
    }

    const exited = await db
      .select({ id: resignations.id })
      .from(resignations)
      .where(
        and(
          eq(resignations.status, "Approved"),
          gte(resignations.lastWorkingDate, from),
          lte(resignations.lastWorkingDate, to),
          inArray(resignations.employeeId, teamIds),
        ),
      );

    const count = exited.length;
    const percentage =
      teamSize > 0 ? Math.round((count / teamSize) * 1000) / 10 : 0;
    res.json({ from, to, count, teamSize, percentage });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/team/attendance", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const now = new Date();
    const defaultTo = ymd(now);
    const defaultFrom = ymd(new Date(now.getTime() - 6 * 86_400_000));
    const from = typeof req.query.from === "string" ? req.query.from : defaultFrom;
    const to = typeof req.query.to === "string" ? req.query.to : defaultTo;
    const team = await db
      .select({
        id: employees.id,
        empId: employees.empId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: designations.name,
      })
      .from(employees)
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(eq(employees.reportingManagerId, mgr.id))
      .orderBy(asc(employees.firstName));
    if (team.length === 0) {
      res.json({ from, to, team: [], records: [] });
      return;
    }
    const teamIds = team.map((t) => t.id);
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        inArray(attendanceRecords.employeeId, teamIds),
        gte(attendanceRecords.date, from),
        lte(attendanceRecords.date, to),
      ));
    res.json({ from, to, team, records });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/team/attendance-report", async (req, res, next) => {
  try {
    const query = teamAttendanceReportQuerySchema.parse(req.query);
    const now = new Date();
    const { start: defaultFrom, end: defaultTo } = startEndOfMonth(
      now.getFullYear(),
      now.getMonth(),
    );
    const fromDate = query.fromDate ?? defaultFrom;
    const toDate = query.toDate ?? defaultTo;
    const offset = (query.page - 1) * query.limit;
    const term = query.search ? `%${query.search}%` : null;

    // Search filter fragments per employee alias used in each CTE branch.
    const searchBio = term
      ? sql`AND (eb.emp_id ILIKE ${term} OR eb.first_name ILIKE ${term} OR eb.last_name ILIKE ${term} OR eb.middle_name ILIKE ${term})`
      : sql``;
    const searchUpl = term
      ? sql`AND (eu.emp_id ILIKE ${term} OR eu.first_name ILIKE ${term} OR eu.last_name ILIKE ${term} OR eu.middle_name ILIKE ${term})`
      : sql``;

    type RawRow = {
      employee_internal_id: number;
      employee_code: string;
      attendance_date: string;
      in_time: string | null;
      out_time: string | null;
      total_hours: string | null;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      department_name: string | null;
      sub_department_name: string | null;
      designation_name: string | null;
      location_name: string | null;
      l2_first_name: string | null;
      l2_middle_name: string | null;
      l2_last_name: string | null;
      l3_first_name: string | null;
      l3_middle_name: string | null;
      l3_last_name: string | null;
    };

    // Merged date-spine from both biometric (attendance_records) and upload sources.
    // DISTINCT ON (employee_id, date) with prio ASC keeps biometric when both exist.
    const [countRaw, dataRaw] = await Promise.all([
      db.execute<{ total: number }>(sql`
        WITH merged AS (
          SELECT ar.employee_id, ar.date::text AS att_date
          FROM   attendance_records ar
          JOIN   employees eb ON eb.id = ar.employee_id
          WHERE  eb.employee_status = 'Active'
            AND  ar.date BETWEEN ${fromDate}::date AND ${toDate}::date
            ${searchBio}
          UNION
          SELECT eu.id, au.attendance_date::text
          FROM   attendance_uploads au
          JOIN   employees eu ON lower(trim(au.employee_code)) = lower(trim(eu.emp_id))
          WHERE  eu.employee_status = 'Active'
            AND  au.attendance_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ${searchUpl}
        )
        SELECT count(*)::int AS total FROM merged
      `),
      db.execute<RawRow>(sql`
        WITH merged AS (
          SELECT ar.employee_id, ar.date::text AS att_date,
                 ar.punch_in::text AS in_time, ar.punch_out::text AS out_time,
                 NULL::text        AS total_hours, 1 AS prio
          FROM   attendance_records ar
          JOIN   employees eb ON eb.id = ar.employee_id
          WHERE  eb.employee_status = 'Active'
            AND  ar.date BETWEEN ${fromDate}::date AND ${toDate}::date
            ${searchBio}
          UNION ALL
          SELECT eu.id, au.attendance_date::text,
                 au.in_time::text, au.out_time::text, au.total_hours::text, 2
          FROM   attendance_uploads au
          JOIN   employees eu ON lower(trim(au.employee_code)) = lower(trim(eu.emp_id))
          WHERE  eu.employee_status = 'Active'
            AND  au.attendance_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ${searchUpl}
        ),
        deduped AS (
          SELECT DISTINCT ON (employee_id, att_date)
                 employee_id, att_date, in_time, out_time, total_hours
          FROM   merged
          ORDER  BY employee_id, att_date, prio ASC
        )
        SELECT
          e.id::int                      AS employee_internal_id,
          e.emp_id                       AS employee_code,
          d.att_date                     AS attendance_date,
          d.in_time, d.out_time, d.total_hours,
          e.first_name, e.middle_name, e.last_name,
          COALESCE(sd.name,  ld.name)   AS department_name,
          COALESCE(ssd.name, lsd.name)  AS sub_department_name,
          COALESCE(sdes.name,ldes.name) AS designation_name,
          COALESCE(lb.name,  fb.name)   AS location_name,
          rm.first_name  AS l2_first_name, rm.middle_name  AS l2_middle_name, rm.last_name  AS l2_last_name,
          l3.first_name  AS l3_first_name, l3.middle_name  AS l3_middle_name, l3.last_name  AS l3_last_name
        FROM   deduped d
        JOIN   employees e    ON e.id   = d.employee_id
        LEFT JOIN org_hierarchy_structure   ohs  ON ohs.id  = e.org_hierarchy_structure_id
        LEFT JOIN org_hierarchy_departments  sd  ON sd.id   = ohs.department_id
        LEFT JOIN org_hierarchy_departments  ld  ON ld.id   = e.department_id
        LEFT JOIN org_hierarchy_sub_departments ssd ON ssd.id = ohs.sub_department_id
        LEFT JOIN org_hierarchy_sub_departments lsd ON lsd.id = e.sub_department_id
        LEFT JOIN org_hierarchy_designations sdes ON sdes.id  = ohs.designation_id
        LEFT JOIN org_hierarchy_designations ldes ON ldes.id  = e.designation_id
        LEFT JOIN branches lb ON lb.id = e.location_id
        LEFT JOIN branches fb ON fb.id = e.branch_id
        LEFT JOIN employees rm ON rm.id = e.reporting_manager_id
        LEFT JOIN employees l3 ON l3.id = rm.reporting_manager_id
        ORDER  BY e.last_name ASC, e.first_name ASC, d.att_date DESC
        LIMIT  ${query.limit} OFFSET ${offset}
      `),
    ]);

    // postgres.js returns array directly; node-postgres uses result.rows — handle both.
    const dataRows: RawRow[] = Array.isArray(dataRaw)
      ? (dataRaw as RawRow[])
      : ((dataRaw as unknown as { rows: RawRow[] }).rows ?? []);
    const countRow: { total: number } | undefined = Array.isArray(countRaw)
      ? (countRaw[0] as { total: number } | undefined)
      : (countRaw as unknown as { rows: Array<{ total: number }> }).rows[0];

    const shiftMap = await resolveShiftsForEmployees(
      [...new Set(dataRows.map((r) => r.employee_internal_id))],
    );
    const employeeIds = [...new Set(dataRows.map((r) => r.employee_internal_id))];
    const dayContextMap = await loadAttendanceDayContextBatch(employeeIds, fromDate, toDate);

    const rows = dataRows.map((row) => {
      const resolved = shiftMap.get(row.employee_internal_id);
      const shift: AttendanceReportShiftInfo | null = resolved
        ? {
            name: resolved.name,
            shiftTiming: resolved.shiftTiming,
            startTime: resolved.startTime,
            endTime: resolved.endTime,
            graceMinutes: resolved.graceMinutes,
            breakMinutes: resolved.breakMinutes,
          }
        : null;

      return shapeAttendanceReportRow({
        attendanceDate: row.attendance_date,
        employeeCode: row.employee_code,
        inTime: row.in_time,
        outTime: row.out_time,
        totalHours: row.total_hours,
        hasUploadRecord: true,
        firstName: row.first_name,
        middleName: row.middle_name,
        lastName: row.last_name,
        departmentName: row.department_name,
        subDepartmentName: row.sub_department_name,
        designationName: row.designation_name,
        locationName: row.location_name,
        reportingManagerL2: row.l2_first_name
          ? formatEmployeeFullName({
              firstName: row.l2_first_name,
              middleName: row.l2_middle_name,
              lastName: row.l2_last_name,
            })
          : null,
        reportingManagerL3: row.l3_first_name
          ? formatEmployeeFullName({
              firstName: row.l3_first_name,
              middleName: row.l3_middle_name,
              lastName: row.l3_last_name,
            })
          : null,
        shift,
        dayContext: dayContextMap.get(row.employee_internal_id),
      });
    });

    res.json({
      rows,
      total: countRow?.total ?? 0,
      page: query.page,
      limit: query.limit,
    });
  } catch (e) {
    next(e);
  }
});

// ── Leave Approvals ─────────────────────────────────────────────────────────
managerRouter.get("/leave-approvals", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const statusQ = typeof req.query.status === "string" ? req.query.status : undefined;

    const conds = [
      or(
        eq(leaveRequests.managerId, mgr.id),
        eq(employees.reportingManagerId, mgr.id),
      )!,
    ];
    if (statusQ && statusQ !== "all") {
      conds.push(eq(leaveRequests.status, capStatus(statusQ) as never));
    }

    const rows = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        empId: employees.empId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: designations.name,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        days: leaveRequests.days,
        durationType: leaveRequests.durationType,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        appliedOn: leaveRequests.appliedOn,
        managerDecision: leaveRequests.managerDecision,
        managerDecidedAt: leaveRequests.managerDecidedAt,
        managerRemarks: leaveRequests.managerRemarks,
        reportingManager: sql<
          string | null
        >`${reportingMgr.firstName} || ' ' || ${reportingMgr.lastName}`,
        reportingManagerEmpId: reportingMgr.empId,
        documentUrls: leaveRequests.documentUrls,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(reportingMgr, eq(reportingMgr.id, employees.reportingManagerId))
      .where(and(...conds))
      .orderBy(desc(leaveRequests.appliedOn));
    const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
    res.json({
      requests: rows.map(({ documentUrls, ...row }) => ({
        ...row,
        documents: (documentUrls ?? []).map((storagePath, index) => ({
          url: `/api/manager/leave-approvals/${row.id}/documents/${index}`,
          name: path.basename(storagePath),
          kind: IMAGE_EXTS.has(path.extname(storagePath).toLowerCase()) ? "image" : "pdf",
        })),
      })),
    });
  } catch (e) {
    next(e);
  }
});

function parseLeaveId(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ApiError(400, "BAD_ID", "Numeric id required.");
  }
  return n;
}

const remarksBody = z.object({ remarks: z.string().max(2000).optional() }).strict();

managerRouter.post("/leave-approvals/:id/approve", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const idNum = parseLeaveId(req.params.id);
    if (!(await leaveOwnedByManager(idNum, mgr.id))) {
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    }

    // Decide whether HR review is required. If yes, manager Approve
    // promotes the request to "Forwarded" (awaiting HR), not directly
    // "Approved". This keeps the existing 5-value status enum.
    const ctx = await loadLeaveRequestParticipants(idNum);
    const hrRequired = ctx
      ? await requiresHRApprovalForEmployee(
          ctx.request.employeeId,
          ctx.request.leaveTypeId,
        )
      : false;

    const nextStatus = hrRequired ? "Forwarded" : "Approved";
    const row = await db.transaction(async (tx) => {
      const [prev] = await tx
        .select({ status: leaveRequests.status })
        .from(leaveRequests)
        .where(eq(leaveRequests.id, idNum))
        .limit(1);
      const [updated] = await tx
        .update(leaveRequests)
        .set({
          managerId: mgr.id,
          managerDecision: "Approved",
          managerDecidedAt: new Date(),
          status: nextStatus,
        })
        .where(eq(leaveRequests.id, idNum))
        .returning();
      if (updated) {
        // Deduct from the employee's balance when this becomes Approved.
        await syncLeaveUsageOnTransition(
          tx,
          updated,
          prev?.status,
          updated.status,
        );
      }
      return updated;
    });

    writeAuditLogAsync({
      actorUserId: req.user!.id,
      actorEmployeeId: mgr.id,
      action: hrRequired
        ? "LEAVE_FORWARDED_BY_MANAGER"
        : "LEAVE_APPROVED_BY_MANAGER",
      entityType: "leave_request",
      entityId: String(idNum),
      metadata: { nextStatus, hrRequired },
    });

    if (ctx) {
      if (hrRequired) {
        notifyHROnForward(ctx.participants, ctx.request).catch(() => {});
      } else {
        notifyEmployeeOnApproval(
          ctx.participants,
          ctx.request,
          ctx.participants.managerName ?? "your manager",
        ).catch(() => {});
      }
    }

    res.json({ request: row });
  } catch (e) {
    next(e);
  }
});

managerRouter.post("/leave-approvals/:id/reject", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const idNum = parseLeaveId(req.params.id);
    const body = remarksBody.parse(req.body ?? {});
    if (!(await leaveOwnedByManager(idNum, mgr.id))) {
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    }
    const ctx = await loadLeaveRequestParticipants(idNum);
    const row = await db.transaction(async (tx) => {
      const [prev] = await tx
        .select({ status: leaveRequests.status })
        .from(leaveRequests)
        .where(eq(leaveRequests.id, idNum))
        .limit(1);
      const [updated] = await tx
        .update(leaveRequests)
        .set({
          managerId: mgr.id,
          managerDecision: "Rejected",
          managerDecidedAt: new Date(),
          managerRemarks: body.remarks ?? null,
          status: "Rejected",
        })
        .where(eq(leaveRequests.id, idNum))
        .returning();
      if (updated) {
        // Restore balance if this leave had already been deducted (Approved).
        await syncLeaveUsageOnTransition(
          tx,
          updated,
          prev?.status,
          updated.status,
        );
      }
      return updated;
    });

    writeAuditLogAsync({
      actorUserId: req.user!.id,
      actorEmployeeId: mgr.id,
      action: "LEAVE_REJECTED_BY_MANAGER",
      entityType: "leave_request",
      entityId: String(idNum),
      metadata: { remarks: body.remarks ?? null },
    });

    if (ctx) {
      notifyEmployeeOnRejection(
        ctx.participants,
        ctx.request,
        ctx.participants.managerName ?? "your manager",
        body.remarks ?? null,
      ).catch(() => {});
    }

    res.json({ request: row });
  } catch (e) {
    next(e);
  }
});

managerRouter.post("/leave-approvals/:id/forward", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const idNum = parseLeaveId(req.params.id);
    if (!(await leaveOwnedByManager(idNum, mgr.id))) {
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    }
    const ctx = await loadLeaveRequestParticipants(idNum);
    const [row] = await db
      .update(leaveRequests)
      .set({
        managerId: mgr.id,
        managerDecision: "Forwarded",
        managerDecidedAt: new Date(),
        status: "Forwarded",
      })
      .where(eq(leaveRequests.id, idNum))
      .returning();

    writeAuditLogAsync({
      actorUserId: req.user!.id,
      actorEmployeeId: mgr.id,
      action: "LEAVE_FORWARDED_BY_MANAGER",
      entityType: "leave_request",
      entityId: String(idNum),
    });

    if (ctx) {
      notifyHROnForward(ctx.participants, ctx.request).catch(() => {});
    }

    res.json({ request: row });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/leave-approvals/:id/documents/:index", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const idNum = parseLeaveId(req.params.id);
    const index = Number(req.params.index);
    if (!Number.isFinite(index) || index < 0) {
      throw new ApiError(400, "BAD_ID", "Invalid document reference.");
    }
    if (!(await leaveOwnedByManager(idNum, mgr.id))) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }
    const [row] = await db
      .select({ documentUrls: leaveRequests.documentUrls })
      .from(leaveRequests)
      .where(eq(leaveRequests.id, idNum))
      .limit(1);
    const storagePath = row?.documentUrls?.[index];
    if (!storagePath) {
      throw new ApiError(404, "NOT_FOUND", "Document not found.");
    }
    const filename = path.basename(storagePath);
    res.setHeader("Content-Type", mimeTypeForLeaveDocument(storagePath));
    res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, "")}"`);
    const readable = await openPrivateFileReadable(storagePath);
    readable.pipe(res);
  } catch (e) {
    next(e);
  }
});

// ── Regularisation Approvals ────────────────────────────────────────────────
managerRouter.get("/regularisation-approvals", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const statusQ = typeof req.query.status === "string" ? req.query.status : undefined;
    const teamIds = (
      await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.reportingManagerId, mgr.id))
    ).map((r) => r.id);
    if (teamIds.length === 0) {
      res.json({ requests: [] });
      return;
    }
    const conds = [inArray(regularisationRequests.employeeId, teamIds)];
    if (statusQ && statusQ !== "all") {
      conds.push(eq(regularisationRequests.status, capStatus(statusQ) as never));
    }
    const rows = await db
      .select({
        id: regularisationRequests.id,
        employeeId: regularisationRequests.employeeId,
        empId: employees.empId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        date: regularisationRequests.date,
        originalIssue: regularisationRequests.originalIssue,
        requestedPunchIn: regularisationRequests.requestedPunchIn,
        requestedPunchOut: regularisationRequests.requestedPunchOut,
        reason: regularisationRequests.reason,
        status: regularisationRequests.status,
        approverRemarks: regularisationRequests.approverRemarks,
        decidedAt: regularisationRequests.decidedAt,
        createdAt: regularisationRequests.createdAt,
      })
      .from(regularisationRequests)
      .innerJoin(employees, eq(regularisationRequests.employeeId, employees.id))
      .where(and(...conds))
      .orderBy(desc(regularisationRequests.createdAt));
    res.json({ requests: rows });
  } catch (e) {
    next(e);
  }
});

// "HH:MM:SS" → total minutes between two times on the same day.
function minutesBetween(startTime: string, endTime: string): number {
  const [sh = 0, sm = 0] = startTime.split(":").map(Number);
  const [eh = 0, em = 0] = endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

managerRouter.post("/regularisation-approvals/:id/approve", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const idNum = parseLeaveId(req.params.id);

    // Wrap the status flip + attendance backfill in a single transaction so a
    // failure on either side doesn't leave the request marked Approved while
    // the calendar still shows Absent for the day.
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(regularisationRequests)
        .set({ status: "Approved", approverId: mgr.id, decidedAt: new Date() })
        .where(eq(regularisationRequests.id, idNum))
        .returning();
      if (!row) {
        throw new ApiError(404, "NOT_FOUND", "Request not found.");
      }

      // Backfill attendance for the regularised date. UPSERT, because the
      // row likely already exists with status='Absent' from the auto-mark.
      // Late/early markers reset to 0 — the approved punches are the new
      // authoritative timing for the day.
      const workingMinutes = minutesBetween(
        row.requestedPunchIn,
        row.requestedPunchOut,
      );
      await tx
        .insert(attendanceRecords)
        .values({
          employeeId: row.employeeId,
          date: row.date,
          punchIn: row.requestedPunchIn,
          punchOut: row.requestedPunchOut,
          workingMinutes,
          lateByMinutes: 0,
          earlyExitMinutes: 0,
          status: "Present",
          location: null,
          isRegularised: true,
          regularisationId: row.id,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.employeeId, attendanceRecords.date],
          set: {
            punchIn: row.requestedPunchIn,
            punchOut: row.requestedPunchOut,
            workingMinutes,
            lateByMinutes: 0,
            earlyExitMinutes: 0,
            status: "Present",
            isRegularised: true,
            regularisationId: row.id,
            updatedAt: new Date(),
          },
        });

      return row;
    });

    res.json({ request: result });
  } catch (e) {
    next(e);
  }
});

managerRouter.post("/regularisation-approvals/:id/reject", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id, req.user!.role);
    const idNum = parseLeaveId(req.params.id);
    const body = remarksBody.parse(req.body ?? {});
    const [row] = await db
      .update(regularisationRequests)
      .set({
        status: "Rejected",
        approverId: mgr.id,
        approverRemarks: body.remarks ?? null,
        decidedAt: new Date(),
      })
      .where(eq(regularisationRequests.id, idNum))
      .returning();
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Request not found.");
    }
    res.json({ request: row });
  } catch (e) {
    next(e);
  }
});
