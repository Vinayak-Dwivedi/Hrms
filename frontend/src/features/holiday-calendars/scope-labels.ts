import type { CalendarScopeRow } from "./api/holiday-calendars.client";

export interface ScopeLabels {
  locationLabel: string | null;
  departmentLabel: string | null;
  subDepartmentLabel: string | null;
}

export function scopeToLabels(
  scope: CalendarScopeRow[],
  branchNames: Map<number, string>,
  departmentNames: Map<number, string>,
  subDepartmentNames: Map<number, string>,
): ScopeLabels {
  const hasCompany = scope.some((s) => s.scopeType === "Company");
  if (hasCompany) {
    return {
      locationLabel: "All Locations",
      departmentLabel: "All Departments",
      subDepartmentLabel: "All Sub-Departments",
    };
  }

  const branchIds = scope
    .filter((s) => s.scopeType === "Branch" && s.scopeId != null)
    .map((s) => s.scopeId!);
  const deptIds = scope
    .filter((s) => s.scopeType === "Department" && s.scopeId != null)
    .map((s) => s.scopeId!);
  const subIds = scope
    .filter((s) => s.scopeType === "SubDepartment" && s.scopeId != null)
    .map((s) => s.scopeId!);

  const locationLabel =
    branchIds.length === 0
      ? "All Locations"
      : branchIds
          .map((id) => branchNames.get(id) ?? `#${id}`)
          .join(", ");

  const departmentLabel =
    deptIds.length === 0
      ? "All Departments"
      : deptIds
          .map((id) => departmentNames.get(id) ?? `#${id}`)
          .join(", ");

  let subDepartmentLabel: string | null;
  if (deptIds.length === 0) {
    subDepartmentLabel = "—";
  } else if (subIds.length === 0) {
    subDepartmentLabel = "All Sub-Departments";
  } else {
    subDepartmentLabel = subIds
      .map((id) => subDepartmentNames.get(id) ?? `#${id}`)
      .join(", ");
  }

  return { locationLabel, departmentLabel, subDepartmentLabel };
}
