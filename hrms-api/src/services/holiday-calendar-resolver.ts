// Resolve which holiday calendar applies to a given employee, by walking
// holiday_calendar_scope rows in specificity order. The most specific scope
// match wins; ties broken by the user-supplied priority (higher first).
//
// Specificity order (highest first):
//   Employee > Designation > Grade > Department > Branch > Location
//   > EmploymentType > Company

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  holidayCalendars,
  holidayCalendarScope,
  holidayTeamLinks,
  holidays,
} from "@/db/schema/hrms";

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

export interface EmployeeDimensions {
  id: number;
  branchId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  designationId: number | null;
  gradeId: number | null;
  employmentTypeId: number | null;
  // Location is not directly attached to employees in the current schema —
  // the app surfaces an employee's branch as their "Location", so Location-
  // wise holiday policies are modelled with the Branch scope. The Location
  // scope type stays unmatched until a true org-location link exists.
}

export async function loadEmployeeDimensions(
  employeeId: number,
): Promise<EmployeeDimensions | null> {
  const [row] = await db
    .select({
      id: employees.id,
      branchId: employees.branchId,
      departmentId: employees.departmentId,
      subDepartmentId: employees.subDepartmentId,
      designationId: employees.designationId,
      gradeId: employees.gradeId,
      employmentTypeId: employees.employmentTypeId,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  return row ?? null;
}

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
      return null; // see EmployeeDimensions note
    case "Company":
      return null; // matches everyone
    default:
      return null;
  }
}

export async function resolveCalendarForEmployee(
  emp: EmployeeDimensions,
): Promise<number | null> {
  // Pull every scope row for any Published calendar, then pick the best
  // match. With only a handful of calendars this is fine; if we ever get
  // thousands of rows we can move this to a SQL-side window.
  const scopeRows = await db
    .select({
      id: holidayCalendarScope.id,
      calendarId: holidayCalendarScope.calendarId,
      scopeType: holidayCalendarScope.scopeType,
      scopeId: holidayCalendarScope.scopeId,
      priority: holidayCalendarScope.priority,
      calendarStatus: holidayCalendars.status,
    })
    .from(holidayCalendarScope)
    .innerJoin(
      holidayCalendars,
      eq(holidayCalendarScope.calendarId, holidayCalendars.id),
    )
    .where(eq(holidayCalendars.status, "Published"));

  let best: { calendarId: number; specificity: number; priority: number } | null = null;

  for (const row of scopeRows) {
    const dimValue = dimensionFieldFor(row.scopeType, emp);
    // Company always matches; others need the employee's value to equal
    // the scope row's scopeId.
    if (row.scopeType === "Company") {
      // ok — applies to everyone
    } else if (dimValue == null || row.scopeId !== dimValue) {
      continue;
    }
    const specificity = SPECIFICITY_ORDER[row.scopeType] ?? 0;
    const candidate = {
      calendarId: row.calendarId,
      specificity,
      priority: row.priority,
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

  return best?.calendarId ?? null;
}

/** Return the set of date strings (YYYY-MM-DD) that are holidays in `calendarId`
 *  within the inclusive date range. Used by leave-validation (M4) for the
 *  date-range overlap warning. */
export async function holidaysInRange(
  calendarId: number,
  fromDate: string,
  toDate: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ date: holidays.date })
    .from(holidays)
    .where(
      and(
        eq(holidays.calendarId, calendarId),
        sql`${holidays.date} >= ${fromDate}::date`,
        sql`${holidays.date} <= ${toDate}::date`,
      ),
    );

  const out = new Set<string>();
  for (const r of rows) {
    const s =
      typeof r.date === "string"
        ? r.date
        : new Date(r.date as unknown as string).toISOString().slice(0, 10);
    out.add(s);
  }
  return out;
}

export interface ResolvedHoliday {
  id: number;
  date: string;
  name: string;
  type: string;
  isHalfDay: boolean;
  description: string | null;
  branchId?: number | null;
}

let cachedHolidayCalendarSchemaReady: boolean | null = null;

function normalizeExecuteRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function holidayCalendarSchemaReady(): Promise<boolean> {
  if (cachedHolidayCalendarSchemaReady !== null) {
    return cachedHolidayCalendarSchemaReady;
  }
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'holiday_calendar_scope'
    ) AS exists
  `);
  const [row] = normalizeExecuteRows<{ exists: boolean }>(result);
  cachedHolidayCalendarSchemaReady = Boolean(row?.exists);
  return cachedHolidayCalendarSchemaReady;
}

function formatHolidayDate(date: unknown): string {
  return typeof date === "string"
    ? date
    : new Date(date as string).toISOString().slice(0, 10);
}

async function legacyHolidaysForEmployee(
  emp: EmployeeDimensions,
  fromDate: string,
  toDate: string,
): Promise<ResolvedHoliday[]> {
  const rows = await db
    .select({
      id: holidays.id,
      date: holidays.date,
      name: holidays.name,
      type: holidays.type,
      branchId: holidays.branchId,
      isHalfDay: holidays.isHalfDay,
      description: holidays.description,
    })
    .from(holidays);

  return rows
    .filter((r) => r.branchId === null || r.branchId === emp.branchId)
    .filter((r) => {
      const dateStr = formatHolidayDate(r.date);
      return dateStr >= fromDate && dateStr <= toDate;
    })
    .map((r) => ({
      id: r.id,
      date: formatHolidayDate(r.date),
      name: r.name,
      type: r.type,
      isHalfDay: r.isHalfDay,
      description: r.description,
      branchId: r.branchId,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

interface PerHolidayScopeRow {
  scopeType: string;
  scopeId: number | null;
}

/** Per-holiday scope check. Returns true if the holiday applies to the given
 *  employee. An empty/missing scope array means "applies to everyone the
 *  calendar covers." A non-empty array means at least one row must match. */
function holidayScopeAllowsEmployee(
  scope: unknown,
  emp: EmployeeDimensions,
): boolean {
  if (!Array.isArray(scope) || scope.length === 0) return true;
  const rows = scope as PerHolidayScopeRow[];
  return rows.some((r) => {
    if (r.scopeType === "Company") return true;
    const dimValue = dimensionFieldFor(r.scopeType, emp);
    return dimValue != null && r.scopeId === dimValue;
  });
}

/** All holidays applicable to the given employee within the inclusive date
 *  range.
 *
 *  Resolution (post team-links):
 *    1. Resolve ALL calendars whose scope rows match the employee (not just
 *       the single best-specificity one — a holiday can come from any team
 *       this employee belongs to).
 *    2. Pull the union of holidays linked to those calendars via
 *       holiday_team_links.
 *    3. De-dupe by holiday id (a holiday linked to 3 of the employee's
 *       teams should only fire once).
 *    4. Apply per-holiday scope JSONB filter.
 */
export async function holidaysForEmployee(
  employeeId: number,
  fromDate: string,
  toDate: string,
): Promise<ResolvedHoliday[]> {
  const emp = await loadEmployeeDimensions(employeeId);
  if (!emp) return [];

  if (!(await holidayCalendarSchemaReady())) {
    return legacyHolidaysForEmployee(emp, fromDate, toDate);
  }

  // Step 1 — every published calendar whose scope matches the employee.
  const calendarIds = await resolveAllCalendarsForEmployee(emp);
  if (calendarIds.length === 0) {
    // Holiday policies are authoritative once any exist: an employee not
    // covered by any published calendar gets no holidays. Only fall back to the
    // legacy global holiday list when NO published calendar exists at all
    // (fresh setup / pre-policy data). To cover everyone, create a policy scoped
    // to "Entire Organisation" (Company scope).
    if (await anyPublishedCalendarExists()) return [];
    return legacyHolidaysForEmployee(emp, fromDate, toDate);
  }

  // Step 2 — holidays linked to any of those calendars, in range, joined to
  // grab fields. distinctOn the holiday id is the cheapest way to de-dupe
  // when a holiday is linked to multiple matching teams.
  const rows = await db
    .selectDistinctOn([holidays.id], {
      id: holidays.id,
      date: holidays.date,
      name: holidays.name,
      type: holidays.type,
      isHalfDay: holidays.isHalfDay,
      description: holidays.description,
      scope: holidays.scope,
    })
    .from(holidays)
    .innerJoin(holidayTeamLinks, eq(holidayTeamLinks.holidayId, holidays.id))
    .where(
      and(
        inArray(holidayTeamLinks.calendarId, calendarIds),
        sql`${holidays.date} >= ${fromDate}::date`,
        sql`${holidays.date} <= ${toDate}::date`,
      ),
    );

  const calendarHolidays = rows
    .filter((r) => holidayScopeAllowsEmployee(r.scope, emp))
    .map((r) => ({
      id: r.id,
      date: formatHolidayDate(r.date),
      name: r.name,
      type: r.type,
      isHalfDay: r.isHalfDay,
      description: r.description,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // The employee is covered by ≥1 calendar, so those calendars define their
  // holidays — an empty in-range result is a legitimate "no holidays", not a
  // reason to fall back to the global list.
  return calendarHolidays;
}

/** True if any Published holiday calendar exists in the system. Used to decide
 *  whether the legacy global-holiday fallback still applies (it only does on a
 *  fresh/pre-policy setup with zero published calendars). */
async function anyPublishedCalendarExists(): Promise<boolean> {
  const [row] = await db
    .select({ id: holidayCalendars.id })
    .from(holidayCalendars)
    .where(eq(holidayCalendars.status, "Published"))
    .limit(1);
  return Boolean(row);
}

/** All published calendars whose scope rows include this employee. Unlike
 *  resolveCalendarForEmployee, this returns every match, not just the most
 *  specific one — because a holiday can come from any team the employee
 *  is a member of. */
async function resolveAllCalendarsForEmployee(
  emp: EmployeeDimensions,
): Promise<number[]> {
  const scopeRows = await db
    .select({
      calendarId: holidayCalendarScope.calendarId,
      scopeType: holidayCalendarScope.scopeType,
      scopeId: holidayCalendarScope.scopeId,
      calendarStatus: holidayCalendars.status,
    })
    .from(holidayCalendarScope)
    .innerJoin(
      holidayCalendars,
      eq(holidayCalendarScope.calendarId, holidayCalendars.id),
    )
    .where(eq(holidayCalendars.status, "Published"));

  const matched = new Set<number>();
  for (const row of scopeRows) {
    if (row.scopeType === "Company") {
      matched.add(row.calendarId);
      continue;
    }
    const dimValue = dimensionFieldFor(row.scopeType, emp);
    if (dimValue != null && row.scopeId === dimValue) {
      matched.add(row.calendarId);
    }
  }
  return Array.from(matched);
}
