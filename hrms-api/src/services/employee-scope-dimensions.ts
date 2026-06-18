import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees, orgHierarchyStructure } from "@/db/schema/hrms";

export interface EmployeeScopeDimensions {
  id: number;
  joiningDate: string | null;
  branchId: number | null;
  locationId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  orgHierarchyDepartmentId: number | null;
  orgHierarchySubDepartmentId: number | null;
}

export async function loadAllEmployeeScopeDimensions(): Promise<
  EmployeeScopeDimensions[]
> {
  return db
    .select({
      id: employees.id,
      joiningDate: employees.joiningDate,
      branchId: employees.branchId,
      locationId: employees.locationId,
      departmentId: employees.departmentId,
      subDepartmentId: employees.subDepartmentId,
      orgHierarchyDepartmentId: orgHierarchyStructure.departmentId,
      orgHierarchySubDepartmentId: orgHierarchyStructure.subDepartmentId,
    })
    .from(employees)
    .leftJoin(
      orgHierarchyStructure,
      eq(employees.orgHierarchyStructureId, orgHierarchyStructure.id),
    );
}

export function employeeBranchScopeId(emp: EmployeeScopeDimensions): number | null {
  return emp.locationId ?? emp.branchId;
}

export function employeeDepartmentScopeId(
  emp: EmployeeScopeDimensions,
): number | null {
  return emp.orgHierarchyDepartmentId ?? emp.departmentId;
}

export function employeeSubDepartmentScopeId(
  emp: EmployeeScopeDimensions,
): number | null {
  return emp.orgHierarchySubDepartmentId ?? emp.subDepartmentId;
}

export function employeeMatchesHierarchyScope(
  emp: EmployeeScopeDimensions,
  scope: { scopeType: string; scopeId: number | null }[],
): boolean {
  if (scope.length === 0) return false;
  if (scope.some((s) => s.scopeType === "Company")) return true;

  const branchRows = scope.filter((s) => s.scopeType === "Branch");
  const deptRows = scope.filter((s) => s.scopeType === "Department");
  const subRows = scope.filter((s) => s.scopeType === "SubDepartment");

  if (
    branchRows.length === 0 &&
    deptRows.length === 0 &&
    subRows.length === 0
  ) {
    return false;
  }

  if (branchRows.length > 0) {
    const branchId = employeeBranchScopeId(emp);
    if (branchId == null || !branchRows.some((r) => r.scopeId === branchId)) {
      return false;
    }
  }

  if (deptRows.length > 0) {
    const deptId = employeeDepartmentScopeId(emp);
    if (deptId == null || !deptRows.some((r) => r.scopeId === deptId)) {
      return false;
    }
  }

  if (subRows.length > 0) {
    const subId = employeeSubDepartmentScopeId(emp);
    if (subId == null || !subRows.some((r) => r.scopeId === subId)) {
      return false;
    }
  }

  return true;
}
