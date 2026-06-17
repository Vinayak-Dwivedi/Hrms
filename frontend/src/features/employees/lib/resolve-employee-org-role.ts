import type { EmployeeListItem } from "../api/employees.client";
import {
  resolveOrgHierarchyRoleDisplay,
  type OrgHierarchyRoleDisplay,
  type OrgHierarchyRoleLookups,
} from "@/features/org-hierarchy/lib/org-hierarchy-role";

export function resolveEmployeeOrgRoleIds(
  emp: Pick<
    EmployeeListItem,
    "orgHierarchyStructureId" | "departmentId" | "designationId"
  >,
  lookups: OrgHierarchyRoleLookups,
): { departmentId: number | null; designationId: number | null } {
  if (emp.orgHierarchyStructureId != null) {
    const structure = lookups.structures.find(
      (row) => row.id === emp.orgHierarchyStructureId,
    );
    if (structure) {
      return {
        departmentId: structure.departmentId,
        designationId: structure.designationId,
      };
    }
  }
  return {
    departmentId: emp.departmentId,
    designationId: emp.designationId,
  };
}

export function resolveEmployeeListRoleDisplay(
  emp: Pick<
    EmployeeListItem,
    "orgHierarchyStructureId" | "departmentId" | "designationId"
  >,
  orgLookups: OrgHierarchyRoleLookups,
  legacyDepartmentNames?: Map<number, string>,
  legacyDesignationNames?: Map<number, string>,
): Pick<OrgHierarchyRoleDisplay, "department" | "designation"> {
  if (emp.orgHierarchyStructureId != null) {
    const display = resolveOrgHierarchyRoleDisplay(
      emp.orgHierarchyStructureId,
      orgLookups,
    );
    return {
      department: display.department,
      designation: display.designation,
    };
  }

  return {
    department:
      emp.departmentId != null && legacyDepartmentNames
        ? (legacyDepartmentNames.get(emp.departmentId) ?? "—")
        : "—",
    designation:
      emp.designationId != null && legacyDesignationNames
        ? (legacyDesignationNames.get(emp.designationId) ?? "—")
        : "—",
  };
}
