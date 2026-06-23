import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  orgHierarchyDesignations,
  orgHierarchyLevels,
  orgHierarchyStructure,
} from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export type ReportingManagerRule =
  | { mode: "designation_names"; names: readonly string[] }
  | { mode: "senior_levels"; employeeSortOrder: number };

export type EmployeeOrgContext = {
  locationId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  designationId: number | null;
  employeeStatus: string;
};

type DesignationRow = { id: number; name: string; levelId: number };
type LevelRow = { id: number; sortOrder: number };

const HOD_DESIGNATION_NAME = "hod";
const TOP_LEVEL_MANAGER_DESIGNATION_NAMES = ["Admin", "HR"] as const;

function normalizeDesignationName(name: string): string {
  return name.trim().toLowerCase();
}

function designationById(
  designationId: number | null,
  designations: DesignationRow[],
): DesignationRow | null {
  if (designationId == null) return null;
  return designations.find((row) => row.id === designationId) ?? null;
}

function designationNameForId(
  designationId: number | null,
  designations: DesignationRow[],
): string | null {
  return designationById(designationId, designations)?.name ?? null;
}

function levelSortOrderForDesignation(
  designationId: number | null,
  designations: DesignationRow[],
  levels: LevelRow[],
): number | null {
  const designation = designationById(designationId, designations);
  if (!designation) return null;
  const level = levels.find((row) => row.id === designation.levelId);
  return level?.sortOrder ?? null;
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
  levels: LevelRow[],
): boolean {
  return levels.some((level) => level.sortOrder > employeeSortOrder);
}

export function resolveReportingManagerRule(
  employeeDesignationId: number | null,
  designations: DesignationRow[],
  levels: LevelRow[],
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

function isSameDesignation(
  employeeDesignationId: number | null,
  managerDesignationId: number | null,
  designations: DesignationRow[],
): boolean {
  if (
    employeeDesignationId != null &&
    managerDesignationId != null &&
    employeeDesignationId === managerDesignationId
  ) {
    return true;
  }

  const employeeName = designationNameForId(employeeDesignationId, designations);
  const managerName = designationNameForId(managerDesignationId, designations);
  return (
    employeeName != null &&
    managerName != null &&
    normalizeDesignationName(employeeName) === normalizeDesignationName(managerName)
  );
}

function managerMatchesRule(
  employee: EmployeeOrgContext,
  manager: EmployeeOrgContext,
  rule: ReportingManagerRule,
  designations: DesignationRow[],
  levels: LevelRow[],
): boolean {
  if (manager.employeeStatus !== "Active") return false;
  if (
    employee.locationId == null ||
    manager.locationId == null ||
    employee.locationId !== manager.locationId
  ) {
    return false;
  }

  if (
    isSameDesignation(
      employee.designationId,
      manager.designationId,
      designations,
    )
  ) {
    return false;
  }

  const managerDesignationName = designationNameForId(
    manager.designationId,
    designations,
  );

  if (rule.mode === "designation_names") {
    return matchesDesignationName(managerDesignationName, rule.names);
  }

  const managerSortOrder = levelSortOrderForDesignation(
    manager.designationId,
    designations,
    levels,
  );
  return (
    managerSortOrder != null && managerSortOrder > rule.employeeSortOrder
  );
}

export function isValidReportingManagerAssignment(
  employee: EmployeeOrgContext,
  manager: EmployeeOrgContext,
  designations: DesignationRow[],
  levels: LevelRow[],
): boolean {
  if (employee.designationId == null) return false;
  if (
    employee.locationId == null ||
    employee.departmentId == null ||
    employee.subDepartmentId == null
  ) {
    return false;
  }

  const rule = resolveReportingManagerRule(
    employee.designationId,
    designations,
    levels,
  );
  if (!rule) return false;

  return managerMatchesRule(employee, manager, rule, designations, levels);
}

async function loadDesignationAndLevelLookups(): Promise<{
  designations: DesignationRow[];
  levels: LevelRow[];
}> {
  const [designations, levels] = await Promise.all([
    db
      .select({
        id: orgHierarchyDesignations.id,
        name: orgHierarchyDesignations.name,
        levelId: orgHierarchyDesignations.levelId,
      })
      .from(orgHierarchyDesignations),
    db
      .select({
        id: orgHierarchyLevels.id,
        sortOrder: orgHierarchyLevels.sortOrder,
      })
      .from(orgHierarchyLevels),
  ]);
  return { designations, levels };
}

async function resolveStructureOrgFields(structureId: number | null): Promise<{
  departmentId: number | null;
  subDepartmentId: number | null;
  designationId: number | null;
}> {
  if (structureId == null) {
    return {
      departmentId: null,
      subDepartmentId: null,
      designationId: null,
    };
  }

  const [structure] = await db
    .select({
      departmentId: orgHierarchyStructure.departmentId,
      subDepartmentId: orgHierarchyStructure.subDepartmentId,
      designationId: orgHierarchyStructure.designationId,
    })
    .from(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.id, structureId))
    .limit(1);

  if (!structure) {
    return {
      departmentId: null,
      subDepartmentId: null,
      designationId: null,
    };
  }

  return structure;
}

export async function loadEmployeeOrgContext(
  employeeId: number,
): Promise<EmployeeOrgContext | null> {
  const [row] = await db
    .select({
      locationId: employees.locationId,
      branchId: employees.branchId,
      departmentId: employees.departmentId,
      subDepartmentId: employees.subDepartmentId,
      designationId: employees.designationId,
      orgHierarchyStructureId: employees.orgHierarchyStructureId,
      employeeStatus: employees.employeeStatus,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!row) return null;

  const structureFields = await resolveStructureOrgFields(
    row.orgHierarchyStructureId,
  );

  return {
    locationId: row.locationId ?? row.branchId,
    departmentId: structureFields.departmentId ?? row.departmentId,
    subDepartmentId: structureFields.subDepartmentId ?? row.subDepartmentId,
    designationId: structureFields.designationId ?? row.designationId,
    employeeStatus: row.employeeStatus,
  };
}

export async function buildEmployeeOrgContextFromPayload(payload: {
  orgHierarchyStructureId?: number | null;
  departmentId?: number | null;
  designationId?: number | null;
  locationId?: number | null;
  branchId?: number | null;
}): Promise<EmployeeOrgContext> {
  const structureFields = await resolveStructureOrgFields(
    payload.orgHierarchyStructureId ?? null,
  );

  return {
    locationId: payload.locationId ?? payload.branchId ?? null,
    departmentId: structureFields.departmentId ?? payload.departmentId ?? null,
    subDepartmentId: structureFields.subDepartmentId,
    designationId: structureFields.designationId ?? payload.designationId ?? null,
    employeeStatus: "Active",
  };
}

export async function assertValidReportingManagerAssignment(params: {
  employee: EmployeeOrgContext;
  managerId: number;
}): Promise<void> {
  const manager = await loadEmployeeOrgContext(params.managerId);
  if (!manager) {
    throw new ApiError(400, "INVALID_MANAGER", "Reporting manager not found.");
  }

  const { designations, levels } = await loadDesignationAndLevelLookups();
  if (
    !isValidReportingManagerAssignment(
      params.employee,
      manager,
      designations,
      levels,
    )
  ) {
    throw new ApiError(
      400,
      "INVALID_MANAGER",
      "Selected reporting manager must hold a senior designation for this employee's role.",
    );
  }
}
