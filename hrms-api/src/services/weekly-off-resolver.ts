// Resolve which weekly-off configuration applies to a given employee, then
// expand it into a set of off-day date strings within a range. Uses the
// same specificity-ranking logic as the holiday calendar resolver.

import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  weeklyOffConfigs,
  weeklyOffRosterEntries,
  weeklyOffScope,
} from "@/db/schema/hrms";
import type { EmployeeDimensions } from "./holiday-calendar-resolver";

const SPECIFICITY_ORDER: Record<string, number> = {
  Employee: 9,
  Designation: 8,
  Grade: 7,
  SubDepartment: 6,
  Department: 5,
  Branch: 4,
  Location: 3,
  EmploymentType: 2,
  Company: 1,
};

// Fixed anchor (a UTC Monday) so a rotational cycle has the same phase no
// matter which date range we expand — otherwise the rotation would depend on
// the query window's start date.
const ROTATION_EPOCH = Date.UTC(2024, 0, 1); // Mon 1 Jan 2024

type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const DAY_ORDER: DayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function dimensionFieldFor(
  scopeType: string,
  emp: EmployeeDimensions,
): number | null {
  switch (scopeType) {
    case "Employee":
      return emp.id;
    case "Branch":
      return emp.branchId;
    case "Department":
      return emp.departmentId;
    case "SubDepartment":
      return emp.subDepartmentId;
    case "Designation":
      return emp.designationId;
    case "Grade":
      return emp.gradeId;
    case "EmploymentType":
      return emp.employmentTypeId;
    case "Location":
      return null; // see holiday-calendar-resolver EmployeeDimensions note
    case "Company":
      return null;
    default:
      return null;
  }
}

export async function resolveWeeklyOffForEmployee(
  emp: EmployeeDimensions,
): Promise<{
  configId: number;
  mode: string;
  settings: Record<string, unknown>;
} | null> {
  const scopeRows = await db
    .select({
      id: weeklyOffScope.id,
      configId: weeklyOffScope.configId,
      scopeType: weeklyOffScope.scopeType,
      scopeId: weeklyOffScope.scopeId,
      priority: weeklyOffScope.priority,
      status: weeklyOffConfigs.status,
      mode: weeklyOffConfigs.mode,
      settings: weeklyOffConfigs.settings,
    })
    .from(weeklyOffScope)
    .innerJoin(
      weeklyOffConfigs,
      eq(weeklyOffScope.configId, weeklyOffConfigs.id),
    )
    .where(eq(weeklyOffConfigs.status, "Published"));

  let best: {
    configId: number;
    specificity: number;
    priority: number;
    mode: string;
    settings: Record<string, unknown>;
  } | null = null;

  for (const row of scopeRows) {
    const dimValue = dimensionFieldFor(row.scopeType, emp);
    if (row.scopeType === "Company") {
      // matches everyone
    } else if (dimValue == null || row.scopeId !== dimValue) {
      continue;
    }
    const specificity = SPECIFICITY_ORDER[row.scopeType] ?? 0;
    const candidate = {
      configId: row.configId,
      specificity,
      priority: row.priority,
      mode: row.mode,
      settings: (row.settings ?? {}) as Record<string, unknown>,
    };
    if (
      !best ||
      candidate.specificity > best.specificity ||
      (candidate.specificity === best.specificity &&
        candidate.priority > best.priority)
    ) {
      best = candidate;
    }
  }

  return best
    ? {
        configId: best.configId,
        mode: best.mode,
        settings: best.settings,
      }
    : null;
}

/** Expand the resolved config into a Set of date strings (YYYY-MM-DD) that
 *  are weekly off within the inclusive range. Rotational mode without a
 *  `pattern` is approximated by repeating the first `offsPerWeek` days of
 *  the week — good enough until the M5 attendance roster lands. */
export function weeklyOffDatesInRange(
  config: { mode: string; settings: Record<string, unknown> },
  fromDate: string,
  toDate: string,
): Set<string> {
  const out = new Set<string>();
  const start = parseDate(fromDate);
  const end = parseDate(toDate);
  if (!start || !end || start > end) return out;

  if (config.mode === "Fixed") {
    const days = (config.settings.days as DayName[] | undefined) ?? [];
    const dayIndices = new Set(days.map((d) => DAY_ORDER.indexOf(d)));
    // Alternate-week days (e.g. 2nd & 4th Saturday): off only on the listed
    // nth occurrences (1–5) of that weekday within the month.
    const alternateDays =
      (config.settings.alternateDays as
        | { day: DayName; weeks: number[] }[]
        | undefined) ?? [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const weekday = d.getUTCDay();
      if (dayIndices.has(weekday)) {
        out.add(d.toISOString().slice(0, 10));
        continue;
      }
      // nth occurrence of this weekday within its month (1-based).
      const nth = Math.floor((d.getUTCDate() - 1) / 7) + 1;
      const matches = alternateDays.some(
        (r) => DAY_ORDER.indexOf(r.day) === weekday && r.weeks.includes(nth),
      );
      if (matches) out.add(d.toISOString().slice(0, 10));
    }
    return out;
  }

  if (config.mode === "Rotational") {
    const pattern = config.settings.pattern as DayName[][] | undefined;
    if (pattern && pattern.length > 0) {
      // Anchor the cycle to a fixed epoch so the rotation phase is stable.
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const weeksFromEpoch = Math.floor(
          (d.getTime() - ROTATION_EPOCH) / (7 * 24 * 60 * 60 * 1000),
        );
        const weekInCycle =
          ((weeksFromEpoch % pattern.length) + pattern.length) % pattern.length;
        const week = pattern[weekInCycle] ?? [];
        const dayIdx = d.getUTCDay();
        if (week.some((day) => DAY_ORDER.indexOf(day) === dayIdx)) {
          out.add(d.toISOString().slice(0, 10));
        }
      }
      return out;
    }
    // No explicit pattern — approximate by taking Sunday as the off day.
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCDay() === 0) out.add(d.toISOString().slice(0, 10));
    }
    return out;
  }

  // Roster mode — no automated expansion until the M5 attendance roster
  // service lands. Return empty so validation doesn't reject roster users.
  return out;
}

function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );
}

/** Roster-mode off-days for one employee: read from the planner's assignments
 *  (weekly_off_roster_entries). Use this instead of weeklyOffDatesInRange when
 *  the resolved config's mode is "Roster". */
export async function rosterOffDatesForEmployee(
  employeeId: number,
  fromDate: string,
  toDate: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ offDate: weeklyOffRosterEntries.offDate })
    .from(weeklyOffRosterEntries)
    .where(
      and(
        eq(weeklyOffRosterEntries.employeeId, employeeId),
        gte(weeklyOffRosterEntries.offDate, fromDate),
        lte(weeklyOffRosterEntries.offDate, toDate),
      ),
    );
  return new Set(
    rows.map((r) =>
      typeof r.offDate === "string" ? r.offDate : String(r.offDate).slice(0, 10),
    ),
  );
}

/** Off-day dates for an employee in a range, handling all three modes:
 *  Fixed/Rotational expand from the config; Roster reads the planner's roster. */
export async function weeklyOffDatesForEmployee(
  emp: EmployeeDimensions,
  fromDate: string,
  toDate: string,
): Promise<Set<string>> {
  const config = await resolveWeeklyOffForEmployee(emp);
  if (!config) return new Set();
  if (config.mode === "Roster") {
    return rosterOffDatesForEmployee(emp.id, fromDate, toDate);
  }
  return weeklyOffDatesInRange(config, fromDate, toDate);
}
