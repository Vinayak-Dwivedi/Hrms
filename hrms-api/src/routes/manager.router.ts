import path from "node:path";
import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  attendanceRecords,
  branches,
  orgHierarchyDepartments as departments,
  orgHierarchyDesignations as designations,
  employees,
  grades,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  regularisationRequests,
  resignations,
} from "@/db/schema/hrms";
import {
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
    const now = new Date();
    const q = monthQuery.parse(req.query);
    const year = q.year ?? now.getFullYear();
    const month1 = q.month ?? now.getMonth() + 1;
    const { start, end } = startEndOfMonth(year, month1 - 1);
    const rows = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, mgr.id),
        gte(attendanceRecords.date, start),
        lte(attendanceRecords.date, end),
      ))
      .orderBy(asc(attendanceRecords.date));
    res.json({ year, month: month1, records: rows });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/me/leave-requests", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
    const rows = await fetchEmployeeLeaveBalances(mgr.id);
    res.json({ balances: rows });
  } catch (e) {
    next(e);
  }
});

managerRouter.get("/me/regularisation-requests", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);

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
    const mgr = await loadCurrentManager(req.user!.id);
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

// ── Leave Approvals ─────────────────────────────────────────────────────────
managerRouter.get("/leave-approvals", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
    const mgr = await loadCurrentManager(req.user!.id);
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
