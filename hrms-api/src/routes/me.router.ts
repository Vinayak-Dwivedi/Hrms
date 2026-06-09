import fs from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  attendanceRecords,
  branches,
  departments,
  designations,
  employees,
  employmentTypes,
  grades,
  holidays,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  regularisationRequests,
} from "@/db/schema/hrms";
import {
  loadCurrentEmployee,
  pad2,
  startEndOfMonth,
  todayYmd,
  ymd,
} from "@/lib/employee";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import { env } from "@/env";
import { ApiError } from "@/middleware/error";
import {
  PROFILE_PIC_SUBDIR,
  profilePhotoUpload,
} from "@/middleware/profile-photo.middleware";
import { meOnboardingRouter } from "@/routes/me-onboarding.router";
import { resolvePolicyForEmployee } from "@/services/leave-policy-resolver";
import { runWorkflowOnNewRequest } from "@/services/leave-workflow-engine";

function resolveProfilePhotoDiskPath(
  profilePhotoUrl: string | null | undefined,
): string | null {
  if (!profilePhotoUrl?.startsWith(`/uploads/${PROFILE_PIC_SUBDIR}/`)) {
    return null;
  }
  const filename = path.basename(profilePhotoUrl);
  return path.join(env.UPLOAD_DIR, PROFILE_PIC_SUBDIR, filename);
}

export const meRouter: Router = Router();

meRouter.use("/onboarding", meOnboardingRouter);

// ── GET /api/me ─────────────────────────────────────────────────────────────
meRouter.get("/", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);

    const [designation] = emp.designationId
      ? await db.select({ name: designations.name }).from(designations)
          .where(eq(designations.id, emp.designationId)).limit(1)
      : [];
    const [department] = emp.departmentId
      ? await db.select({ name: departments.name }).from(departments)
          .where(eq(departments.id, emp.departmentId)).limit(1)
      : [];
    const [grade] = emp.gradeId
      ? await db.select({ code: grades.code }).from(grades)
          .where(eq(grades.id, emp.gradeId)).limit(1)
      : [];
    const [branch] = emp.branchId
      ? await db.select({ name: branches.name }).from(branches)
          .where(eq(branches.id, emp.branchId)).limit(1)
      : [];
    const [employmentType] = emp.employmentTypeId
      ? await db.select({ name: employmentTypes.name }).from(employmentTypes)
          .where(eq(employmentTypes.id, emp.employmentTypeId)).limit(1)
      : [];
    const [manager] = emp.reportingManagerId
      ? await db
          .select({
            firstName: employees.firstName,
            lastName: employees.lastName,
            empId: employees.empId,
          })
          .from(employees)
          .where(eq(employees.id, emp.reportingManagerId))
          .limit(1)
      : [];

    const initials = `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
    res.json({
      id: emp.id,
      empId: emp.empId,
      firstName: emp.firstName,
      middleName: emp.middleName ?? null,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`,
      initials,
      avatarUrl: emp.profilePhotoUrl ?? null,
      email: req.user!.email,
      personalEmail: emp.personalEmail,
      personalEmailVerified: emp.personalEmailVerified,
      personalEmailVerifiedAt:
        emp.personalEmailVerifiedAt?.toISOString() ?? null,
      workEmail: emp.workEmail,
      phone: emp.phone,
      phoneVerified: emp.phoneVerified,
      phoneVerifiedAt: emp.phoneVerifiedAt?.toISOString() ?? null,
      gender: emp.gender,
      dob: emp.dob,
      role: designation?.name ?? null,
      department: department?.name ?? null,
      grade: grade?.code ?? null,
      branch: branch?.name ?? null,
      employmentType: employmentType?.name ?? null,
      reportingManager: manager
        ? `${manager.firstName} ${manager.lastName}`
        : null,
      reportingManagerEmpId: manager?.empId ?? null,
      joiningDate: emp.joiningDate,
      currentAddress: emp.currentAddress ?? null,
      permanentAddress: emp.permanentAddress ?? null,
      emergencyContactName: emp.emergencyContactName ?? null,
      emergencyContactPhone: emp.emergencyContactPhone ?? null,
    });
  } catch (e) {
    next(e);
  }
});

// ── PATCH /api/me ─────────────────────────────────────────────────────────────
// Self-service profile update. Employees may change only their own contact
// details — phone, personal email, addresses, and emergency contact. All other
// fields (org placement, reporting line, dates) are HR/admin-controlled and are
// intentionally not accepted here.
const updateMeSchema = z
  .object({
    phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number"),
    personalEmail: z.string().trim().email().max(255),
    currentAddress: z.string().trim().max(5000).optional(),
    permanentAddress: z.string().trim().max(5000).optional(),
    emergencyContactName: z.string().trim().max(200).optional(),
    emergencyContactPhone: z.string().trim().max(20).optional(),
  })
  .strict();

// ── POST /api/me/profile-photo ──────────────────────────────────────────────
meRouter.post(
  "/profile-photo",
  profilePhotoUpload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, "NO_FILE", "No image uploaded.");
      }

      const emp = await loadCurrentEmployee(req.user!.id);
      const relativeUrl = `/uploads/${PROFILE_PIC_SUBDIR}/${req.file.filename}`;
      const oldPath = resolveProfilePhotoDiskPath(emp.profilePhotoUrl);
      if (oldPath && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      await db
        .update(employees)
        .set({
          profilePhotoUrl: relativeUrl,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, emp.id));

      res.json({
        ok: true,
        avatarUrl: relativeUrl,
        profilePhotoUrl: relativeUrl,
      });
    } catch (e) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(e);
    }
  },
);

meRouter.patch("/", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const body = updateMeSchema.parse(req.body);

    // emergency_contact_phone has a CHECK (NULL or ^\+?[0-9]{7,15}$); coerce
    // empty → null and validate a provided value before it reaches the DB.
    const emergencyPhone = body.emergencyContactPhone?.trim() || null;
    if (emergencyPhone && !/^\+?[0-9]{7,15}$/.test(emergencyPhone)) {
      throw new ApiError(
        400,
        "INVALID_EMERGENCY_PHONE",
        "Emergency contact phone must be 7–15 digits.",
      );
    }

    const nextPersonalEmail = body.personalEmail.toLowerCase();
    const emailChanged =
      nextPersonalEmail !== emp.personalEmail.toLowerCase();
    const phoneChanged = body.phone !== emp.phone;
    const columnSupport = await getEmployeeColumnSupport();

    await db
      .update(employees)
      .set({
        phone: body.phone,
        personalEmail: nextPersonalEmail,
        ...(emailChanged && columnSupport.personalEmailVerified
          ? {
              personalEmailVerified: false,
              personalEmailVerifiedAt: null,
            }
          : {}),
        ...(phoneChanged && columnSupport.phoneVerified
          ? {
              phoneVerified: false,
              phoneVerifiedAt: null,
            }
          : {}),
        currentAddress: body.currentAddress?.trim() || null,
        permanentAddress: body.permanentAddress?.trim() || null,
        emergencyContactName: body.emergencyContactName?.trim() || null,
        emergencyContactPhone: emergencyPhone,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, emp.id));

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ── Attendance ──────────────────────────────────────────────────────────────
meRouter.get("/attendance/today", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const today = todayYmd();
    const [row] = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, emp.id),
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

meRouter.get("/attendance/month", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const now = new Date();
    const q = monthQuery.parse(req.query);
    const year = q.year ?? now.getFullYear();
    const month1 = q.month ?? now.getMonth() + 1;
    const { start, end } = startEndOfMonth(year, month1 - 1);
    const rows = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, emp.id),
        gte(attendanceRecords.date, start),
        lte(attendanceRecords.date, end),
      ))
      .orderBy(asc(attendanceRecords.date));
    res.json({ year, month: month1, records: rows });
  } catch (e) {
    next(e);
  }
});

// ── GET /api/me/attendance/week ─────────────────────────────────────────────
// Rollup for a window of attendance — 7d (default, Mon-Sun ISO week) or 30d
// (rolling 30 days ending today). Returns per-day records, chart-ready buckets,
// and totals. The dashboard's Attendance Overview consumes this directly.
//
// Query params:
//   ?window=7|30   — default 7
//   ?date=YYYY-MM-DD  — anchor (defaults to today); only meaningful for 7d
meRouter.get("/attendance/week", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);

    const windowParam: "7d" | "30d" =
      req.query.window === "30" || req.query.window === "30d" ? "30d" : "7d";

    const anchorRaw =
      typeof req.query.date === "string" ? req.query.date : null;
    const anchor =
      anchorRaw && /^\d{4}-\d{2}-\d{2}$/.test(anchorRaw)
        ? new Date(`${anchorRaw}T00:00:00Z`)
        : new Date();

    // Pick start/end of the window.
    let start: Date;
    let end: Date;
    if (windowParam === "7d") {
      // Monday-start ISO week containing anchor. JS getDay(): 0=Sun, 1=Mon … 6=Sat.
      const dow = anchor.getUTCDay();
      const offsetToMonday = (dow + 6) % 7;
      start = new Date(anchor);
      start.setUTCDate(anchor.getUTCDate() - offsetToMonday);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
    } else {
      // Rolling 30 days ending on the anchor (inclusive).
      end = new Date(anchor);
      start = new Date(anchor);
      start.setUTCDate(anchor.getUTCDate() - 29);
    }

    const startStr = ymd(start);
    const endStr = ymd(end);

    const rows = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, emp.id),
        gte(attendanceRecords.date, startStr),
        lte(attendanceRecords.date, endStr),
      ))
      .orderBy(asc(attendanceRecords.date));

    // Build a per-day array filling in null records for missing days so the
    // UI doesn't have to do calendar math.
    const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayCount = windowParam === "7d" ? 7 : 30;
    const days: Array<{
      date: string;
      dayLabel: string;
      record: typeof rows[number] | null;
    }> = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const dateStr = ymd(d);
      const rec = rows.find((r) => r.date === dateStr) ?? null;
      const dow = d.getUTCDay();
      const idxFromMon = (dow + 6) % 7;
      days.push({ date: dateStr, dayLabel: DOW[idxFromMon] ?? "", record: rec });
    }

    // Build chart-ready points. For 7d → one point per day; for 30d → five
    // weekly buckets of six days each, labelled by their start date (e.g. "May 8").
    const MONTH_SHORT = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const chartPoints: Array<{
      label: string;
      presentMins: number;
      absentCount: number;
      leaveCount: number;
    }> = [];

    if (windowParam === "7d") {
      for (const d of days) {
        chartPoints.push({
          label: d.dayLabel,
          presentMins:
            d.record?.status === "Present" ? (d.record.workingMinutes ?? 0) : 0,
          absentCount: d.record?.status === "Absent" ? 1 : 0,
          leaveCount: d.record?.status === "Leave" ? 1 : 0,
        });
      }
    } else {
      const bucketSize = 6;
      const bucketCount = 5;
      for (let i = 0; i < bucketCount; i++) {
        const slice = days.slice(i * bucketSize, (i + 1) * bucketSize);
        if (slice.length === 0) continue;
        const first = new Date(`${slice[0]!.date}T00:00:00Z`);
        const label = `${MONTH_SHORT[first.getUTCMonth()]} ${first.getUTCDate()}`;
        chartPoints.push({
          label,
          presentMins: slice.reduce(
            (s, d) =>
              s +
              (d.record?.status === "Present" ? (d.record.workingMinutes ?? 0) : 0),
            0,
          ),
          absentCount: slice.filter((d) => d.record?.status === "Absent").length,
          leaveCount: slice.filter((d) => d.record?.status === "Leave").length,
        });
      }
    }

    const totals = {
      totalWorkingMinutes: rows.reduce(
        (s, r) => s + (r.workingMinutes ?? 0),
        0,
      ),
      present: rows.filter((r) => r.status === "Present").length,
      absent: rows.filter((r) => r.status === "Absent").length,
      onLeave: rows.filter((r) => r.status === "Leave").length,
      lateArrivals: rows.filter((r) => (r.lateByMinutes ?? 0) > 0).length,
    };

    res.json({
      weekStart: startStr,
      weekEnd: endStr,
      window: windowParam,
      days,
      chartPoints,
      totals,
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /api/me/holidays ────────────────────────────────────────────────────
// Returns the holiday calendar visible to this employee. Branch-specific
// rows (matching the employee's branch) are mixed in with company-wide
// (branch_id IS NULL) rows.
const holidaysQuery = z
  .object({
    upcoming: z
      .string()
      .optional()
      .transform((v) => v === "true" || v === "1"),
    limit: z.coerce.number().int().positive().max(50).default(20),
  })
  .strict();

meRouter.get("/holidays", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const q = holidaysQuery.parse(req.query);

    // Pull all matching rows then filter / sort in JS — the holidays table
    // is tiny and this keeps the SQL trivial regardless of upcoming vs. all.
    const rows = await db
      .select({
        id: holidays.id,
        date: holidays.date,
        name: holidays.name,
        type: holidays.type,
        branchId: holidays.branchId,
      })
      .from(holidays);

    const visible = rows.filter(
      (r) => r.branchId === null || r.branchId === emp.branchId,
    );

    const filtered = q.upcoming
      ? visible.filter((r) => r.date >= todayYmd())
      : visible;

    filtered.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ holidays: filtered.slice(0, q.limit) });
  } catch (e) {
    next(e);
  }
});

meRouter.post("/punch-in", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const now = new Date();
    const today = ymd(now);
    const timeOnly = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    const [existing] = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, emp.id),
        eq(attendanceRecords.date, today),
      ))
      .limit(1);
    if (existing) {
      throw new ApiError(409, "ALREADY_PUNCHED_IN", "Already punched in today.");
    }
    const [row] = await db
      .insert(attendanceRecords)
      .values({
        employeeId: emp.id,
        date: today,
        punchIn: timeOnly,
        status: "Present",
        location: "Web",
      })
      .returning();
    res.status(201).json({ record: row });
  } catch (e) {
    next(e);
  }
});

meRouter.post("/punch-out", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const now = new Date();
    const today = ymd(now);
    const timeOnly = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    const [existing] = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, emp.id),
        eq(attendanceRecords.date, today),
      ))
      .limit(1);
    if (!existing) {
      throw new ApiError(404, "NOT_PUNCHED_IN", "No punch-in record for today.");
    }
    if (!existing.punchIn) {
      throw new ApiError(400, "NO_PUNCH_IN", "Punch-in time missing on today's record.");
    }
    const inParts = existing.punchIn.split(":").map(Number);
    const inMinutes = (inParts[0] ?? 0) * 60 + (inParts[1] ?? 0);
    const outMinutes = now.getHours() * 60 + now.getMinutes();
    const working = Math.max(0, outMinutes - inMinutes);
    const [row] = await db
      .update(attendanceRecords)
      .set({ punchOut: timeOnly, workingMinutes: working })
      .where(and(
        eq(attendanceRecords.employeeId, emp.id),
        eq(attendanceRecords.date, today),
      ))
      .returning();
    res.json({ record: row });
  } catch (e) {
    next(e);
  }
});

// ── Leave ───────────────────────────────────────────────────────────────────
meRouter.get("/leave-requests", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
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
      .where(eq(leaveRequests.employeeId, emp.id))
      .orderBy(desc(leaveRequests.appliedOn));
    res.json({ requests: rows });
  } catch (e) {
    next(e);
  }
});

// GET /api/me/leave-policy?leaveTypeCode=CO
//   Resolves the leave policy that applies to the current employee for the
//   given leave_type. Drives the dashboard's "your policy says…" cards and
//   the Apply Leave form's behavior.
meRouter.get("/leave-policy", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const code = typeof req.query.leaveTypeCode === "string"
      ? req.query.leaveTypeCode
      : null;
    const id = req.query.leaveTypeId ? Number(req.query.leaveTypeId) : null;
    if (!code && !id) {
      throw new ApiError(
        400,
        "BAD_QUERY",
        "leaveTypeCode or leaveTypeId is required.",
      );
    }
    const result = await resolvePolicyForEmployee(emp.id, {
      id: id ?? undefined,
      code: code ?? undefined,
    });
    if (!result) {
      throw new ApiError(404, "NOT_FOUND", "Leave type not found.");
    }
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

meRouter.get("/leave-balances", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const rows = await db
      .select({
        leaveTypeId: leaveTypes.id,
        name: leaveTypes.name,
        code: leaveTypes.code,
        openingBalance: leaveBalances.openingBalance,
        used: leaveBalances.used,
        closingBalance: leaveBalances.closingBalance,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(eq(leaveBalances.employeeId, emp.id));
    res.json({ balances: rows });
  } catch (e) {
    next(e);
  }
});

const createLeaveSchema = z.object({
  leaveTypeCode: z.string().optional(),
  leaveTypeId: z.number().int().positive().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.union([z.string(), z.number()]),
  durationType: z.enum(["Full Day", "First Half", "Second Half"]),
  reason: z.string().min(1).max(2000),
}).refine((d) => d.leaveTypeCode || d.leaveTypeId, {
  message: "leaveTypeCode or leaveTypeId required",
});

meRouter.post("/leave-requests", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const body = createLeaveSchema.parse(req.body);
    let leaveTypeId = body.leaveTypeId;
    if (!leaveTypeId && body.leaveTypeCode) {
      const [lt] = await db
        .select({ id: leaveTypes.id })
        .from(leaveTypes)
        .where(eq(leaveTypes.code, body.leaveTypeCode))
        .limit(1);
      leaveTypeId = lt?.id;
    }
    if (!leaveTypeId) {
      throw new ApiError(400, "UNKNOWN_LEAVE_TYPE", "leaveTypeCode did not match any leave_type.");
    }
    const [row] = await db
      .insert(leaveRequests)
      .values({
        employeeId: emp.id,
        leaveTypeId,
        fromDate: body.fromDate,
        toDate: body.toDate,
        days: String(body.days),
        durationType: body.durationType,
        reason: body.reason,
        status: "Pending",
        managerId: emp.reportingManagerId ?? null,
      })
      .returning();

    // Run the policy's approval workflow. AutoApprove / AutoReject flip the
    // status inline; Route leaves it Pending for the manager to handle.
    const workflowResult = await runWorkflowOnNewRequest({
      requestId: row!.id,
      employeeId: emp.id,
      leaveTypeId,
      days: Number(body.days),
      durationType: body.durationType,
      reason: body.reason,
      actorUserId: req.user!.id,
    });

    // Re-read the row so the response reflects any workflow-applied changes.
    const [finalRow] = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, row!.id))
      .limit(1);

    res.status(201).json({
      request: finalRow,
      workflow: workflowResult.workflowName
        ? { name: workflowResult.workflowName, appliedStatus: workflowResult.status }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

meRouter.post("/leave-requests/:id/cancel", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const [row] = await db
      .update(leaveRequests)
      .set({ status: "Cancelled" })
      .where(and(eq(leaveRequests.id, idNum), eq(leaveRequests.employeeId, emp.id)))
      .returning();
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }
    res.json({ request: row });
  } catch (e) {
    next(e);
  }
});

// ── Regularisation ──────────────────────────────────────────────────────────
meRouter.get("/regularisation-requests", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const rows = await db
      .select()
      .from(regularisationRequests)
      .where(eq(regularisationRequests.employeeId, emp.id))
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

meRouter.post("/regularisation-requests", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const body = createRegSchema.parse(req.body);
    if (body.date > todayYmd()) {
      throw new ApiError(400, "FUTURE_DATE", "Regularisation is only allowed for past or current dates.");
    }
    const [row] = await db
      .insert(regularisationRequests)
      .values({
        employeeId: emp.id,
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
