import type {
  OrgDesignation,
  OrgLevel,
  OrgStructure,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import type { EmployeeListItem, ManagerOption } from "../api/employees.client";

export type ReportingManagerScope = {
  locationId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
};

export type ReportingManagerRule =
  | { mode: "designation_names"; names: readonly string[] }
  | { mode: "senior_levels"; employeeSortOrder: number };

const HOD_DESIGNATION_NAME = "hod";
const TOP_LEVEL_MANAGER_DESIGNATION_NAMES = ["Admin", "HR"] as const;

function parsePositiveId(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function normalizeDesignationName(name: string): string {
  return name.trim().toLowerCase();
}

function employeeWorkLocationId(
  employee: Pick<EmployeeListItem, "locationId" | "branchId">,
): number | null {
  return employee.locationId ?? employee.branchId ?? null;
}

function resolveEmployeeOrgScope(
  employee: EmployeeListItem,
  structures: OrgStructure[],
): { departmentId: number | null; subDepartmentId: number | null } {
  if (employee.departmentId != null && employee.subDepartmentId != null) {
    return {
      departmentId: employee.departmentId,
      subDepartmentId: employee.subDepartmentId,
    };
  }

  if (employee.orgHierarchyStructureId != null) {
    const structure = structures.find(
      (row) => row.id === employee.orgHierarchyStructureId,
    );
    if (structure) {
      return {
        departmentId: structure.departmentId,
        subDepartmentId: structure.subDepartmentId,
      };
    }
  }

  return {
    departmentId: employee.departmentId ?? null,
    subDepartmentId: employee.subDepartmentId ?? null,
  };
}

export function resolveEmployeeDesignationId(
  employee: EmployeeListItem,
  structures: OrgStructure[],
): number | null {
  if (employee.designationId != null) {
    return employee.designationId;
  }

  if (employee.orgHierarchyStructureId != null) {
    const structure = structures.find(
      (row) => row.id === employee.orgHierarchyStructureId,
    );
    if (structure) {
      return structure.designationId;
    }
  }

  return null;
}

function designationById(
  designationId: number | null,
  designations: OrgDesignation[],
): OrgDesignation | null {
  if (designationId == null) return null;
  return designations.find((row) => row.id === designationId) ?? null;
}

function levelSortOrderForDesignation(
  designationId: number | null,
  designations: OrgDesignation[],
  levels: OrgLevel[],
): number | null {
  const designation = designationById(designationId, designations);
  if (!designation) return null;
  const level = levels.find((row) => row.id === designation.levelId);
  return level?.sortOrder ?? null;
}

function designationNameForId(
  designationId: number | null,
  designations: OrgDesignation[],
): string | null {
  return designationById(designationId, designations)?.name ?? null;
}

function matchesDesignationName(
  candidateName: string | null,
  allowedNames: readonly string[],
): boolean {
  if (!candidateName) return false;
  const normalized = normalizeDesignationName(candidateName);
  return allowedNames.some(
    (name) => normalizeDesignationName(name) === normalized,
  );
}

function hasSeniorLevel(
  employeeSortOrder: number,
  levels: OrgLevel[],
): boolean {
  return levels.some((level) => level.sortOrder > employeeSortOrder);
}

export function resolveReportingManagerRule(
  employeeDesignationId: number | null,
  designations: OrgDesignation[],
  levels: OrgLevel[],
): ReportingManagerRule | null {
  const designation = designationById(employeeDesignationId, designations);
  if (!designation) return null;

  if (normalizeDesignationName(designation.name) === HOD_DESIGNATION_NAME) {
    return {
      mode: "designation_names",
      names: TOP_LEVEL_MANAGER_DESIGNATION_NAMES,
    };
  }

  const currentLevel = levels.find((row) => row.id === designation.levelId);
  if (!currentLevel) return null;

  if (!hasSeniorLevel(currentLevel.sortOrder, levels)) {
    return {
      mode: "designation_names",
      names: TOP_LEVEL_MANAGER_DESIGNATION_NAMES,
    };
  }

  return {
    mode: "senior_levels",
    employeeSortOrder: currentLevel.sortOrder,
  };
}

export function reportingManagerRuleDescription(
  rule: ReportingManagerRule | null,
): string | undefined {
  if (!rule) return undefined;
  if (rule.mode === "designation_names") {
    return `Reports to ${rule.names.join(" or ")} at this location. Admin is selected by default when available.`;
  }
  return "Reports to an employee with a senior designation at this location.";
}

export function scopeFromFormValues(values: {
  locationId?: string;
  orgHierarchyDepartmentId?: string;
  orgHierarchySubDepartmentId?: string;
}): ReportingManagerScope {
  return {
    locationId: parsePositiveId(values.locationId),
    departmentId: parsePositiveId(values.orgHierarchyDepartmentId),
    subDepartmentId: parsePositiveId(values.orgHierarchySubDepartmentId),
  };
}

export function isReportingManagerScopeComplete(
  scope: ReportingManagerScope,
): boolean {
  return (
    scope.locationId != null &&
    scope.departmentId != null &&
    scope.subDepartmentId != null
  );
}

export function isReportingManagerFilterReady(
  scope: ReportingManagerScope,
  employeeDesignationId: number | null,
): boolean {
  return isReportingManagerScopeComplete(scope) && employeeDesignationId != null;
}

function isSameDesignation(
  employeeDesignationId: number | null,
  candidateDesignationId: number | null,
  designations: OrgDesignation[],
): boolean {
  if (
    employeeDesignationId != null &&
    candidateDesignationId != null &&
    employeeDesignationId === candidateDesignationId
  ) {
    return true;
  }

  const employeeName = designationNameForId(employeeDesignationId, designations);
  const candidateName = designationNameForId(
    candidateDesignationId,
    designations,
  );
  return (
    employeeName != null &&
    candidateName != null &&
    normalizeDesignationName(employeeName) ===
      normalizeDesignationName(candidateName)
  );
}

function employeeMatchesRule(
  employee: EmployeeListItem,
  structures: OrgStructure[],
  rule: ReportingManagerRule,
  employeeDesignationId: number | null,
  designations: OrgDesignation[],
  levels: OrgLevel[],
): boolean {
  const candidateDesignationId = resolveEmployeeDesignationId(
    employee,
    structures,
  );

  if (
    isSameDesignation(
      employeeDesignationId,
      candidateDesignationId,
      designations,
    )
  ) {
    return false;
  }

  const candidateDesignationName = designationNameForId(
    candidateDesignationId,
    designations,
  );

  if (rule.mode === "designation_names") {
    return matchesDesignationName(
      candidateDesignationName,
      rule.names,
    );
  }

  const candidateSortOrder = levelSortOrderForDesignation(
    candidateDesignationId,
    designations,
    levels,
  );
  return (
    candidateSortOrder != null && candidateSortOrder > rule.employeeSortOrder
  );
}

export function filterReportingManagerOptions(
  employees: EmployeeListItem[],
  structures: OrgStructure[],
  scope: ReportingManagerScope,
  employeeDesignationId: number | null,
  designations: OrgDesignation[],
  levels: OrgLevel[],
  excludeEmployeeId?: number,
): ManagerOption[] {
  if (!isReportingManagerFilterReady(scope, employeeDesignationId)) {
    return [];
  }

  const rule = resolveReportingManagerRule(
    employeeDesignationId,
    designations,
    levels,
  );
  if (!rule) return [];

  const { locationId } = scope;

  return employees
    .filter((employee) => {
      if (excludeEmployeeId != null && employee.id === excludeEmployeeId) {
        return false;
      }
      if (employee.employeeStatus !== "Active") {
        return false;
      }
      if (employeeWorkLocationId(employee) !== locationId) {
        return false;
      }
      return employeeMatchesRule(
        employee,
        structures,
        rule,
        employeeDesignationId,
        designations,
        levels,
      );
    })
    .map((employee) => ({
      id: employee.id,
      label: `${employee.firstName} ${employee.lastName} (${employee.empId})`,
    }));
}

/** Prefer Admin, then HR, when HOD (or top-level) allows multiple managers. */
export function defaultReportingManagerId(
  managers: ManagerOption[],
  options?: {
    rule?: ReportingManagerRule | null;
    employees?: EmployeeListItem[];
    structures?: OrgStructure[];
    designations?: OrgDesignation[];
  },
): string | null {
  if (managers.length === 0) return null;
  if (managers.length === 1) return String(managers[0].id);

  if (
    options?.rule?.mode === "designation_names" &&
    options.employees &&
    options.structures &&
    options.designations
  ) {
    for (const preferredName of options.rule.names) {
      const match = managers.find((manager) => {
        const employee = options.employees!.find((row) => row.id === manager.id);
        if (!employee) return false;
        const designationId = resolveEmployeeDesignationId(
          employee,
          options.structures!,
        );
        const designationName = designationNameForId(
          designationId,
          options.designations!,
        );
        return (
          designationName != null &&
          normalizeDesignationName(designationName) ===
            normalizeDesignationName(preferredName)
        );
      });
      if (match) return String(match.id);
    }
  }

  return null;
}
