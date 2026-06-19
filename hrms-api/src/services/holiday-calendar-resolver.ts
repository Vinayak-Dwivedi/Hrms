// Resolve which holidays apply to a given employee. Each holiday carries its
// own per-holiday `scope` (Branch / Department / SubDepartment / … rows); an
// empty scope means the holiday applies to the whole organisation. Holiday
// calendars / teams were retired — `holidays.scope` is the single source of
// truth (matching the Holiday Policy admin table).

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  holidays,
  orgHierarchyStructure,
} from "@/db/schema/hrms";

export interface EmployeeDimensions {
  id: number;
  branchId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  designationId: number | null;
  gradeId: number | null;
  employmentTypeId: number | null;
  orgHierarchyDepartmentId: number | null;
  orgHierarchySubDepartmentId: number | null;
  // Location is not directly attached to employees in the current schema, so a
  // holiday's "Location" is modelled as a Branch scope row (Branch → branchId).
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
      orgHierarchyDepartmentId: orgHierarchyStructure.departmentId,
      orgHierarchySubDepartmentId: orgHierarchyStructure.subDepartmentId,
    })
    .from(employees)
    .leftJoin(
      orgHierarchyStructure,
      eq(employees.orgHierarchyStructureId, orgHierarchyStructure.id),
    )
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
      return emp.orgHierarchyDepartmentId ?? emp.departmentId;
    case "SubDepartment":
      return emp.orgHierarchySubDepartmentId ?? emp.subDepartmentId;
    case "Designation":
      return emp.designationId;
    case "Grade":
      return emp.gradeId;
    case "EmploymentType":
      return emp.employmentTypeId;
    case "Location":
      return null; // locations are modelled as Branch scope rows
    case "Company":
      return null; // matches everyone
    default:
      return null;
  }
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

function formatHolidayDate(date: unknown): string {
  return typeof date === "string"
    ? date
    : new Date(date as string).toISOString().slice(0, 10);
}

interface PerHolidayScopeRow {
  scopeType: string;
  scopeId: number | null;
}

/** Per-holiday scope check. An empty/missing scope array means "applies to
 *  everyone"; a non-empty array means at least one row must match (OR). */
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
 *  range. A holiday applies when its own per-holiday scope matches the employee
 *  (empty scope = the whole company). */
export async function holidaysForEmployee(
  employeeId: number,
  fromDate: string,
  toDate: string,
): Promise<ResolvedHoliday[]> {
  const emp = await loadEmployeeDimensions(employeeId);
  if (!emp) return [];

  const rows = await db
    .select({
      id: holidays.id,
      date: holidays.date,
      name: holidays.name,
      type: holidays.type,
      isHalfDay: holidays.isHalfDay,
      description: holidays.description,
      scope: holidays.scope,
    })
    .from(holidays)
    .where(
      and(
        sql`${holidays.date} >= ${fromDate}::date`,
        sql`${holidays.date} <= ${toDate}::date`,
      ),
    );

  return rows
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
}
