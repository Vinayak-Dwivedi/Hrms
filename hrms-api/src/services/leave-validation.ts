// Leave application validation engine. Runs before inserting a row into
// leave_requests. Returns structured pass/fail so the API layer can shape a
// 422 response and the UI can surface field-level messages.
//
// Spec checks (the 7 the admin doc lists). What's implemented today:
//   1. Balance        — implemented (queries leave_balances)
//   2. Holiday        — implemented (uses holiday calendar resolver)
//   3. Weekly Off     — implemented (uses weekly-off resolver)
//   4. Overlap        — implemented (queries pending/approved requests)
//   5. Attendance     — DEFERRED to M9 (attendance integration)
//   6. Probation      — implemented (90-day default from joining_date)
//   7. Gender         — implemented (employees.gender vs leave_types.gender_restriction)

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  leaveBalances,
  leaveRequests,
  leaveTypes,
} from "@/db/schema/hrms";
import {
  loadEmployeeDimensions,
  holidaysForEmployee,
} from "./holiday-calendar-resolver";
import {
  resolveWeeklyOffForEmployee,
  rosterOffDatesForEmployee,
  weeklyOffDatesInRange,
} from "./weekly-off-resolver";

export type ValidationCode =
  | "BALANCE_INSUFFICIENT"
  | "DATES_INCLUDE_HOLIDAY"
  | "DATES_INCLUDE_WEEKLY_OFF"
  | "OVERLAPPING_REQUEST"
  | "BLOCKED_IN_PROBATION"
  | "GENDER_RESTRICTED"
  | "LEAVE_TYPE_INACTIVE"
  | "MIN_NOTICE_NOT_MET"
  | "EXCEEDS_MAX_CONTINUOUS"
  | "ATTACHMENT_MISSING";

export interface ValidationIssue {
  code: ValidationCode;
  field?: string;
  message: string;
  // Extra structured data for the UI to render specifics (e.g. which days).
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationInput {
  employeeId: number;
  leaveTypeId: number;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  days: number;
  hasAttachment?: boolean;
}

const PROBATION_DAYS_DEFAULT = 90;

export async function validateLeaveApplication(
  input: ValidationInput,
): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Pre-load everything we need in parallel.
  const [emp, leaveTypeRow, dims] = await Promise.all([
    db
      .select({
        id: employees.id,
        gender: employees.gender,
        joiningDate: employees.joiningDate,
      })
      .from(employees)
      .where(eq(employees.id, input.employeeId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.id, input.leaveTypeId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    loadEmployeeDimensions(input.employeeId),
  ]);

  if (!emp) {
    errors.push({
      code: "BALANCE_INSUFFICIENT",
      message: "Employee record not found.",
    });
    return { ok: false, errors, warnings };
  }
  if (!leaveTypeRow) {
    errors.push({
      code: "LEAVE_TYPE_INACTIVE",
      field: "leaveTypeId",
      message: "Unknown leave type.",
    });
    return { ok: false, errors, warnings };
  }
  if (!leaveTypeRow.isActive) {
    errors.push({
      code: "LEAVE_TYPE_INACTIVE",
      field: "leaveTypeId",
      message: `Leave type "${leaveTypeRow.name}" is inactive.`,
    });
  }

  // ── 1. Balance ───────────────────────────────────────────────────────
  if (!leaveTypeRow.allowNegativeBalance) {
    const [bal] = await db
      .select({ closing: leaveBalances.closingBalance })
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.employeeId, input.employeeId),
          eq(leaveBalances.leaveTypeId, input.leaveTypeId),
        ),
      )
      .limit(1);
    const closing = bal ? Number(bal.closing) : 0;
    if (closing < input.days) {
      errors.push({
        code: "BALANCE_INSUFFICIENT",
        field: "days",
        message: `Insufficient ${leaveTypeRow.name} balance. Available: ${closing}, requested: ${input.days}.`,
        details: { available: closing, requested: input.days },
      });
    }
  }

  // ── 6. Probation ─────────────────────────────────────────────────────
  if (!leaveTypeRow.allowedInProbation) {
    const joiningStr =
      typeof emp.joiningDate === "string"
        ? emp.joiningDate
        : new Date(emp.joiningDate as unknown as string).toISOString().slice(0, 10);
    const joining = parseDate(joiningStr);
    if (joining) {
      const probationEnd = new Date(joining);
      probationEnd.setUTCDate(joining.getUTCDate() + PROBATION_DAYS_DEFAULT);
      const reqStart = parseDate(input.fromDate);
      if (reqStart && reqStart < probationEnd) {
        errors.push({
          code: "BLOCKED_IN_PROBATION",
          field: "leaveTypeId",
          message: `${leaveTypeRow.name} is not available during the probation period (first ${PROBATION_DAYS_DEFAULT} days from joining).`,
          details: { probationEnd: probationEnd.toISOString().slice(0, 10) },
        });
      }
    }
  }

  // ── 7. Gender ────────────────────────────────────────────────────────
  if (
    leaveTypeRow.genderRestriction &&
    leaveTypeRow.genderRestriction !== emp.gender
  ) {
    errors.push({
      code: "GENDER_RESTRICTED",
      field: "leaveTypeId",
      message: `${leaveTypeRow.name} is only available for ${leaveTypeRow.genderRestriction} employees.`,
    });
  }

  // ── Min notice / max continuous (cheap leave-type-only checks) ───────
  if (leaveTypeRow.minNoticeDays > 0) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const reqStart = parseDate(input.fromDate);
    if (reqStart) {
      const noticeDays = Math.floor(
        (reqStart.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (noticeDays < leaveTypeRow.minNoticeDays) {
        errors.push({
          code: "MIN_NOTICE_NOT_MET",
          field: "fromDate",
          message: `${leaveTypeRow.name} needs at least ${leaveTypeRow.minNoticeDays} day(s) notice.`,
          details: {
            required: leaveTypeRow.minNoticeDays,
            actual: noticeDays,
          },
        });
      }
    }
  }
  if (
    leaveTypeRow.maxContinuousDays != null &&
    input.days > leaveTypeRow.maxContinuousDays
  ) {
    errors.push({
      code: "EXCEEDS_MAX_CONTINUOUS",
      field: "days",
      message: `${leaveTypeRow.name} allows a maximum continuous stretch of ${leaveTypeRow.maxContinuousDays} day(s).`,
      details: {
        max: leaveTypeRow.maxContinuousDays,
        requested: input.days,
      },
    });
  }

  // ── Proof requirement (threshold-based) ──────────────────────────────
  if (
    leaveTypeRow.requiresProofAfterDays != null &&
    input.days > leaveTypeRow.requiresProofAfterDays &&
    !input.hasAttachment
  ) {
    errors.push({
      code: "ATTACHMENT_MISSING",
      field: "documentUrls",
      message: `${leaveTypeRow.name} requires a supporting document when leave exceeds ${leaveTypeRow.requiresProofAfterDays} day(s).`,
    });
  }

  // ── 4. Overlap ───────────────────────────────────────────────────────
  // Any existing Pending or Approved request whose [from, to] intersects
  // [input.from, input.to] is an overlap. Half-day vs full-day overlap is
  // a refinement we'll add when half-day flow stabilises.
  const overlappingRows = await db
    .select({
      id: leaveRequests.id,
      fromDate: leaveRequests.fromDate,
      toDate: leaveRequests.toDate,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, input.employeeId),
        inArray(leaveRequests.status, ["Pending", "Approved"]),
        // [a, b] overlaps [c, d] iff a <= d AND c <= b
        sql`${leaveRequests.fromDate} <= ${input.toDate}::date`,
        sql`${leaveRequests.toDate} >= ${input.fromDate}::date`,
      ),
    );
  if (overlappingRows.length > 0) {
    errors.push({
      code: "OVERLAPPING_REQUEST",
      field: "fromDate",
      message:
        "You already have a pending or approved request that overlaps these dates.",
      details: { overlapping: overlappingRows.map((r) => r.id) },
    });
  }

  // ── 2/3. Holiday + Weekly Off ────────────────────────────────────────
  // These are warnings, not hard errors — the application is still valid;
  // we just don't want the employee to burn balance on a day they wouldn't
  // be working anyway. The UI surfaces these as inline notices.
  if (dims) {
    // Per-holiday scope decides which holidays apply to this employee.
    const empHolidays = await holidaysForEmployee(
      dims.id,
      input.fromDate,
      input.toDate,
    );
    const holidayDates = new Set(empHolidays.map((h) => h.date));
    if (holidayDates.size > 0) {
      warnings.push({
        code: "DATES_INCLUDE_HOLIDAY",
        field: "fromDate",
        message: `${holidayDates.size} day(s) in this range are public holidays.`,
        details: { dates: Array.from(holidayDates).sort() },
      });
    }

    const woConfig = await resolveWeeklyOffForEmployee(dims);
    if (woConfig) {
      // Roster mode reads the planner's per-employee assignments; Fixed /
      // Rotational expand from the config formula.
      const woDates =
        woConfig.mode === "Roster"
          ? await rosterOffDatesForEmployee(dims.id, input.fromDate, input.toDate)
          : weeklyOffDatesInRange(woConfig, input.fromDate, input.toDate);
      if (woDates.size > 0) {
        warnings.push({
          code: "DATES_INCLUDE_WEEKLY_OFF",
          field: "fromDate",
          message: `${woDates.size} day(s) in this range are weekly offs.`,
          details: { dates: Array.from(woDates).sort() },
        });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
