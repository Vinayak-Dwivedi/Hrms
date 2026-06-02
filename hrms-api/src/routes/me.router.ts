import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  attendanceRecords,
  branches,
  departments,
  designations,
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
import { ApiError } from "@/middleware/error";

export const meRouter: Router = Router();

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

    const initials = `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();
    res.json({
      id: emp.id,
      empId: emp.empId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`,
      initials,
      avatarUrl: emp.profilePhotoUrl ?? null,
      workEmail: emp.workEmail,
      phone: emp.phone,
      role: designation?.name ?? null,
      department: department?.name ?? null,
      grade: grade?.code ?? null,
      branch: branch?.name ?? null,
      joiningDate: emp.joiningDate,
    });
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
// Rollup for the current ISO week (Monday → Sunday). Returns per-day records
// plus totals — the dashboard's weekly chart consumes this directly.
meRouter.get("/attendance/week", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);

    // Optional ?date=YYYY-MM-DD to anchor a specific week (defaults to today).
    const anchorRaw =
      typeof req.query.date === "string" ? req.query.date : null;
    const anchor = anchorRaw && /^\d{4}-\d{2}-\d{2}$/.test(anchorRaw)
      ? new Date(`${anchorRaw}T00:00:00Z`)
      : new Date();
    // Monday-start. JS getDay(): 0=Sun, 1=Mon … 6=Sat.
    const dow = anchor.getUTCDay();
    const offsetToMonday = (dow + 6) % 7;
    const monday = new Date(anchor);
    monday.setUTCDate(anchor.getUTCDate() - offsetToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const start = ymd(monday);
    const end = ymd(sunday);

    const rows = await db
      .select()
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.employeeId, emp.id),
        gte(attendanceRecords.date, start),
        lte(attendanceRecords.date, end),
      ))
      .orderBy(asc(attendanceRecords.date));

    // Build a Mon-Sun array, filling in null records for days with no entry
    // so the UI doesn't have to do calendar math.
    const days: Array<{
      date: string;
      dayLabel: string;
      record: typeof rows[number] | null;
    }> = [];
    const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = ymd(d);
      const rec = rows.find((r) => r.date === dateStr) ?? null;
      days.push({ date: dateStr, dayLabel: DOW[i] ?? "", record: rec });
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
      weekStart: start,
      weekEnd: end,
      days,
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
    res.status(201).json({ request: row });
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
