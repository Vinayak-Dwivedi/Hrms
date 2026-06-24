import path from "node:path";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  attendanceRecords,
  branches,
  employees,
  employmentTypes,
  grades,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  orgHierarchyDepartments,
  orgHierarchyDesignations,
  orgHierarchyLevels,
  orgHierarchyStructure,
  regularisationRequests,
} from "@/db/schema/hrms";
import {
  formatEmployeeFullName,
  loadCurrentEmployee,
  pad2,
  startEndOfMonth,
  todayYmd,
  ymd,
} from "@/lib/employee";
import {
  formatAuthRoleLabel,
  userTypeIdFromAuthRole,
  userTypeLabelFromId,
  userTypeSlugFromId,
} from "@/lib/user-type";
import { users } from "@/db/schema/auth";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import { env } from "@/env";
import { ApiError } from "@/middleware/error";
import {
  PROFILE_PIC_SUBDIR,
  extensionForMime,
  profilePhotoUpload,
} from "@/middleware/profile-photo.middleware";
import { documentUpload } from "@/middleware/upload.middleware";
import { meOnboardingRouter } from "@/routes/me-onboarding.router";
import { resolveWorkflowStages } from "@/routes/approval-workflows.router";
import { resolvePolicyForEmployee } from "@/services/leave-policy-resolver";
import { loadLeaveTypeRulesById } from "@/lib/leave-type-schema-compat";
import {
  fetchEmployeeLeaveBalances,
  validateLeaveRequest,
} from "@/services/leave-request-validation";
import { runWorkflowOnNewRequest } from "@/services/leave-workflow-engine";
import { validateLeaveApplication } from "@/services/leave-validation";
import { holidaysForEmployee } from "@/services/holiday-calendar-resolver";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { loadLeaveRequestParticipants } from "@/services/leave-routing";
import { notifyManagerOnSubmission } from "@/services/leave-notifications";
import { syncLeaveUsageOnTransition } from "@/services/leave-balance";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import { saveLeaveRequestDocument } from "@/lib/leave-document-storage";
import {
  mapLeaveDocumentUrls,
  mimeTypeForLeaveDocument,
} from "@/lib/leave-document-urls";
import {
  deletePrivateFile,
  openPrivateFileReadable,
  validateAndSavePrivateFile,
} from "@/infrastructure/storage/private-file-storage";

/** Returns the storage path (S3 key or local path) from a profilePhotoUrl, or null. */
function storagePathFromPhotoUrl(
  profilePhotoUrl: string | null | undefined,
): string | null {
  if (!profilePhotoUrl) return null;
  // New format: "profile_pic/uuid.jpg"  (S3 key)
  if (profilePhotoUrl.startsWith(`${PROFILE_PIC_SUBDIR}/`)) return profilePhotoUrl;
  // Legacy format: "/uploads/profile_pic/uuid.jpg"
  if (profilePhotoUrl.startsWith(`/uploads/${PROFILE_PIC_SUBDIR}/`)) {
    return `${PROFILE_PIC_SUBDIR}/${path.basename(profilePhotoUrl)}`;
  }
  return null;
}

export const meRouter: Router = Router();

meRouter.use("/onboarding", meOnboardingRouter);

// ── GET /api/me ─────────────────────────────────────────────────────────────
// ── Notifications ───────────────────────────────────────────────────────────
meRouter.get("/notifications", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const { items, unread } = await listMyNotifications(emp.id);
    res.json({
      unread,
      items: items.map((n) => ({
        id: String(n.id),
        kind: n.kind,
        title: n.title,
        sub: n.sub,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    next(e);
  }
});

meRouter.patch("/notifications/:id/read", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    await markNotificationRead(emp.id, BigInt(req.params.id ?? "0"));
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

meRouter.post("/notifications/read-all", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    await markAllNotificationsRead(emp.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

meRouter.get("/", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);

    const [designation] = emp.designationId
      ? await db.select({ name: orgHierarchyDesignations.name }).from(orgHierarchyDesignations)
          .where(eq(orgHierarchyDesignations.id, emp.designationId)).limit(1)
      : [];
    const [department] = emp.departmentId
      ? await db.select({ name: orgHierarchyDepartments.name }).from(orgHierarchyDepartments)
          .where(eq(orgHierarchyDepartments.id, emp.departmentId)).limit(1)
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

    // Employees are configured via the org-hierarchy structure, so the legacy
    // departmentId/designationId/gradeId are usually null. Resolve department,
    // designation and grade (level) from the structure when present; fall back
    // to the legacy lookups above otherwise.
    const [orgRole] = emp.orgHierarchyStructureId
      ? await db
          .select({
            department: orgHierarchyDepartments.name,
            designation: orgHierarchyDesignations.name,
            levelCode: orgHierarchyLevels.code,
          })
          .from(orgHierarchyStructure)
          .leftJoin(
            orgHierarchyDepartments,
            eq(orgHierarchyDepartments.id, orgHierarchyStructure.departmentId),
          )
          .leftJoin(
            orgHierarchyDesignations,
            eq(orgHierarchyDesignations.id, orgHierarchyStructure.designationId),
          )
          .leftJoin(
            orgHierarchyLevels,
            eq(orgHierarchyLevels.id, orgHierarchyStructure.levelId),
          )
          .where(eq(orgHierarchyStructure.id, emp.orgHierarchyStructureId))
          .limit(1)
      : [];

    const [authUser] = await db
      .select({
        name: users.name,
        role: users.role,
        userTypeId: users.userTypeId,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    const authRole = req.user!.role;
    const userTypeId =
      authUser?.userTypeId ?? userTypeIdFromAuthRole(authRole);
    const fullName =
      formatEmployeeFullName(emp) || authUser?.name?.trim() || emp.empId;
    // Prefer the org-hierarchy structure; fall back to the legacy lookups.
    const designationName = orgRole?.designation ?? designation?.name ?? null;
    const departmentName = orgRole?.department ?? department?.name ?? null;
    const gradeName = orgRole?.levelCode ?? grade?.code ?? null;
    const initials = `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase();

    res.json({
      id: emp.id,
      empId: emp.empId,
      firstName: emp.firstName,
      middleName: emp.middleName ?? null,
      lastName: emp.lastName,
      fullName,
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
      designation: designationName,
      role: designationName,
      authRole,
      authRoleLabel: formatAuthRoleLabel(authRole),
      userTypeId,
      userType: userTypeSlugFromId(userTypeId),
      userTypeLabel: userTypeLabelFromId(userTypeId),
      department: departmentName,
      grade: gradeName,
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

      // Delete old photo if exists
      const oldStoragePath = storagePathFromPhotoUrl(emp.profilePhotoUrl);
      if (oldStoragePath) {
        await deletePrivateFile(oldStoragePath).catch(() => {});
      }

      // Save to S3 (or local disk fallback)
      const ext = extensionForMime(req.file.mimetype);
      const saved = await validateAndSavePrivateFile({
        employeeId: emp.id,
        originalName: `photo${ext}`,
        buffer: req.file.buffer,
        declaredMime: req.file.mimetype,
        storageSubdir: PROFILE_PIC_SUBDIR,
      });

      // Store the S3 key (storagePath) as the profilePhotoUrl
      await db
        .update(employees)
        .set({ profilePhotoUrl: saved.storagePath, updatedAt: new Date() })
        .where(eq(employees.id, emp.id));

      // Serve via our proxy endpoint
      const avatarUrl = `/api/me/profile-photo`;
      res.json({ ok: true, avatarUrl, profilePhotoUrl: saved.storagePath });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /api/me/profile-photo ───────────────────────────────────────────────
meRouter.get("/profile-photo", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const storagePath = storagePathFromPhotoUrl(emp.profilePhotoUrl);
    if (!storagePath) throw new ApiError(404, "NOT_FOUND", "No profile photo.");
    const ext = path.extname(storagePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=300");
    const readable = await openPrivateFileReadable(storagePath);
    readable.pipe(res);
  } catch (e) {
    next(e);
  }
});

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

    // Attendance records + holidays for the same range, in parallel.
    const [rows, monthHolidays] = await Promise.all([
      db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, emp.id),
            gte(attendanceRecords.date, start),
            lte(attendanceRecords.date, end),
          ),
        )
        .orderBy(asc(attendanceRecords.date)),
      holidaysForEmployee(emp.id, start, end),
    ]);

    res.json({
      year,
      month: month1,
      records: rows,
      // M5 — surface the employee's holidays for the month so the calendar
      // can render holiday cells alongside attendance cells.
      holidays: monthHolidays.map((h) => ({
        id: h.id,
        date: h.date,
        name: h.name,
        type: h.type,
        isHalfDay: h.isHalfDay,
      })),
    });
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
// Returns holidays applicable to this employee.
//
// Resolution (M5 calendar-aware):
//   1. Find the holiday_calendar that applies to the employee via
//      holiday_calendar_scope (specificity ranking).
//   2. Pull the calendar's holidays within the requested date range.
//   3. Filter by per-holiday `scope` JSONB (an empty scope applies to all
//      employees the calendar covers).
//   4. If no calendar matches the employee, fall back to the legacy
//      branch-keyed `holidays` table so historical seed data still appears.
//
// Two query modes:
//   ?upcoming=true&limit=N            → next N upcoming holidays
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD    → all holidays in the inclusive range
//
// Response shape stays backward compatible: `{ holidays: [{ id, date, name,
// type, branchId, isHalfDay }, ...] }`. branchId is null for calendar-sourced
// rows.
const holidaysQuery = z
  .object({
    upcoming: z
      .string()
      .optional()
      .transform((v) => v === "true" || v === "1"),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    year: z.coerce.number().int().min(1970).max(9999).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .strict();

meRouter.get("/holidays", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const q = holidaysQuery.parse(req.query);

    // Build the date range.
    //   Range mode: from/to required.
    //   Upcoming mode: today through one year forward.
    //   Default: today through one year forward (so the dashboard's existing
    //   "fetch upcoming" call keeps working unchanged).
    const today = todayYmd();
    const oneYear = new Date(today);
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    const oneYearStr = oneYear.toISOString().slice(0, 10);

    const fromDate = q.from ?? today;
    const toDate = q.to ?? oneYearStr;

    const resolvedHolidays = await holidaysForEmployee(emp.id, fromDate, toDate);

    let result = resolvedHolidays.map((h) => ({
      id: h.id,
      date: h.date,
      name: h.name,
      type: h.type,
      branchId: h.branchId ?? null,
      isHalfDay: h.isHalfDay,
    }));

    // Upcoming-only filter (defaults to upcoming when neither from nor
    // upcoming flags are supplied — preserves the old endpoint contract).
    if (q.upcoming || (!q.from && !q.to)) {
      result = result.filter((r) => r.date >= today);
    }

    if (q.year != null && q.month != null) {
      const prefix = `${q.year}-${String(q.month).padStart(2, "0")}`;
      result = result.filter((r) => r.date.startsWith(prefix));
    }

    result.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ holidays: result.slice(0, q.limit) });
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
        documentUrls: leaveRequests.documentUrls,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.employeeId, emp.id))
      .orderBy(desc(leaveRequests.appliedOn));
    res.json({
      requests: rows.map(({ documentUrls, ...row }) => ({
        ...row,
        documents: mapLeaveDocumentUrls(row.id, documentUrls),
      })),
    });
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
    const typeRow = await loadLeaveTypeRulesById(result.leaveTypeId);
    res.json({
      data: {
        ...result,
        leaveType: typeRow,
      },
    });
  } catch (e) {
    next(e);
  }
});

meRouter.get("/leave-balances", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const rows = await fetchEmployeeLeaveBalances(emp.id);
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
  reason: z
    .string()
    .min(1)
    .max(2000)
    .refine(
      (r) => r.trim().split(/\s+/).filter(Boolean).length <= 200,
      "Reason must be 200 words or fewer.",
    ),
}).refine((d) => d.leaveTypeCode || d.leaveTypeId, {
  message: "leaveTypeCode or leaveTypeId required",
});

meRouter.get("/leave-requests/:id/documents/:index", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const idNum = Number(req.params.id);
    const index = Number(req.params.index);
    if (!Number.isFinite(idNum) || !Number.isFinite(index) || index < 0) {
      throw new ApiError(400, "BAD_ID", "Invalid document reference.");
    }
    const [row] = await db
      .select({
        documentUrls: leaveRequests.documentUrls,
        employeeId: leaveRequests.employeeId,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.id, idNum),
          eq(leaveRequests.employeeId, emp.id),
        ),
      )
      .limit(1);
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }
    const storagePath = row.documentUrls?.[index];
    if (!storagePath) {
      throw new ApiError(404, "NOT_FOUND", "Document not found.");
    }
    const filename = path.basename(storagePath);
    res.setHeader("Content-Type", mimeTypeForLeaveDocument(storagePath));
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename.replace(/"/g, "")}"`,
    );
    const readable = await openPrivateFileReadable(storagePath);
    readable.pipe(res);
  } catch (e) {
    next(e);
  }
});

meRouter.post("/leave-requests", documentUpload.single("document"), async (req, res, next) => {
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

    const validated = await validateLeaveRequest({
      employeeId: emp.id,
      branchId: emp.branchId,
      leaveTypeId,
      fromDate: body.fromDate,
      toDate: body.durationType === "Full Day" ? body.toDate : body.fromDate,
      durationType: body.durationType,
    });

    // Non-blocking checks (holidays / weekly-offs falling inside the range).
    // Only the warnings are surfaced — hard errors are already enforced by
    // validateLeaveRequest above, so we don't re-reject here.
    const application = await validateLeaveApplication({
      employeeId: emp.id,
      leaveTypeId,
      fromDate: body.fromDate,
      toDate: body.durationType === "Full Day" ? body.toDate : body.fromDate,
      days: validated.days,
      hasAttachment: Boolean(req.file),
    });

    const attachmentError = application.errors.find(
      (issue) => issue.code === "ATTACHMENT_MISSING",
    );
    if (attachmentError) {
      throw new ApiError(400, attachmentError.code, attachmentError.message);
    }

    // Snapshot the approval workflow stages onto the request at creation time
    // (the workflow engine below advances `currentStage` through them).
    const workflowStages = await resolveWorkflowStages(emp.id);

    const [row] = await db
      .insert(leaveRequests)
      .values({
        employeeId: emp.id,
        leaveTypeId: validated.leaveTypeId,
        fromDate: body.fromDate,
        toDate: body.durationType === "Full Day" ? body.toDate : body.fromDate,
        days: String(validated.days),
        durationType: body.durationType,
        reason: body.reason,
        status: "Pending",
        managerId: emp.reportingManagerId ?? null,
        workflowStages,
        currentStage: 0,
      })
      .returning();

    if (req.file) {
      const storagePath = await saveLeaveRequestDocument({
        employeeId: emp.id,
        requestId: row!.id,
        file: req.file,
      });
      await db
        .update(leaveRequests)
        .set({ documentUrls: [storagePath] })
        .where(eq(leaveRequests.id, row!.id));
    }

    // Run the policy's approval workflow. AutoApprove / AutoReject flip the
    // status inline; Route leaves it Pending for the manager to handle.
    const workflowResult = await runWorkflowOnNewRequest({
      requestId: row!.id,
      employeeId: emp.id,
      leaveTypeId: validated.leaveTypeId,
      days: validated.days,
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

    // M5 — audit + notification for the submission.
    writeAuditLogAsync({
      actorUserId: req.user!.id,
      actorEmployeeId: emp.id,
      action: "LEAVE_SUBMITTED",
      entityType: "leave_request",
      entityId: String(row!.id),
      metadata: {
        leaveTypeId,
        days: Number(body.days),
        fromDate: body.fromDate,
        toDate: body.toDate,
        workflowOutcome: workflowResult.status,
      },
    });

    // If the workflow didn't auto-decide, the request is now sitting in the
    // manager's inbox. Send them a heads-up email.
    if (workflowResult.status === "Pending") {
      const ctx = await loadLeaveRequestParticipants(row!.id);
      if (ctx) {
        notifyManagerOnSubmission(ctx.participants, ctx.request).catch(
          () => {},
        );
      }
    }

    res.status(201).json({
      request: finalRow,
      workflow: workflowResult.workflowName
        ? { name: workflowResult.workflowName, appliedStatus: workflowResult.status }
        : null,
      // Non-blocking validation warnings (holidays/weekly-offs in range).
      warnings: application.warnings,
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
    const row = await db.transaction(async (tx) => {
      const [prev] = await tx
        .select({ status: leaveRequests.status })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.id, idNum),
            eq(leaveRequests.employeeId, emp.id),
          ),
        )
        .limit(1);
      const [updated] = await tx
        .update(leaveRequests)
        .set({ status: "Cancelled" })
        .where(
          and(
            eq(leaveRequests.id, idNum),
            eq(leaveRequests.employeeId, emp.id),
          ),
        )
        .returning();
      if (updated) {
        // Restore balance if cancelling an already-approved (deducted) leave.
        await syncLeaveUsageOnTransition(
          tx,
          updated,
          prev?.status,
          updated.status,
        );
      }
      return updated;
    });
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }
    writeAuditLogAsync({
      actorUserId: req.user!.id,
      actorEmployeeId: emp.id,
      action: "LEAVE_CANCELLED",
      entityType: "leave_request",
      entityId: String(idNum),
    });
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
  reason: z
    .string()
    .min(1)
    .max(2000)
    .refine(
      (r) => r.trim().split(/\s+/).filter(Boolean).length <= 200,
      "Reason must be 200 words or fewer.",
    ),
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
