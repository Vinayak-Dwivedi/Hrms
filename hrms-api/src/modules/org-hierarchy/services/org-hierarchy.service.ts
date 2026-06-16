import { mapDbErrorToApiError, extractPostgresError } from "@/lib/db-error";
import { ApiError } from "@/middleware/error";
import * as repo from "@/modules/org-hierarchy/repositories/org-hierarchy.repository";
import type {
  CreateDepartmentInput,
  CreateDesignationInput,
  CreateLevelInput,
  CreateStructureInput,
  CreateSubDepartmentInput,
  UpdateDepartmentInput,
  UpdateDesignationInput,
  UpdateLevelInput,
  UpdateStructureInput,
  UpdateSubDepartmentInput,
} from "@/modules/org-hierarchy/schemas/org-hierarchy.schema";
import { buildEmployeeReportingTree } from "@/modules/org-hierarchy/services/employee-reporting-tree";
import { buildHierarchyTree } from "@/modules/org-hierarchy/services/org-hierarchy-tree";

type ListFilters = {
  limit?: number;
  offset?: number;
  status?: "Active" | "Inactive";
  departmentId?: number;
  levelId?: number;
  companyId?: number;
};

function wrapDbError(e: unknown): never {
  const pg = extractPostgresError(e);
  if (pg?.code === "23505") {
    const ctx = `${pg.constraint_name ?? ""} ${pg.detail ?? ""}`;
    if (/org_hierarchy_dept_company_name|org_hierarchy_dept_company_code/i.test(ctx)) {
      throw new ApiError(409, "DUPLICATE_DEPARTMENT", "Department already exists.");
    }
    if (/org_hierarchy_sub_dept_name/i.test(ctx)) {
      throw new ApiError(
        409,
        "DUPLICATE_SUB_DEPARTMENT",
        "Sub-department already exists for this department.",
      );
    }
    if (/org_hierarchy_structure_uq/i.test(ctx)) {
      throw new ApiError(
        409,
        "DUPLICATE_STRUCTURE",
        "This hierarchy mapping already exists.",
      );
    }
    if (/org_hierarchy_designations_name/i.test(ctx)) {
      throw new ApiError(409, "DUPLICATE_DESIGNATION", "Designation already exists.");
    }
    if (/org_hierarchy_levels_code/i.test(ctx)) {
      throw new ApiError(409, "DUPLICATE_LEVEL", "Level code already exists.");
    }
  }
  if (pg?.code === "23503") {
    throw new ApiError(
      409,
      "REFERENCE_IN_USE",
      "Cannot delete or update: record is referenced by other data.",
    );
  }
  throw mapDbErrorToApiError(e);
}

async function assertDepartmentExists(id: number) {
  const row = await repo.getDepartmentById(id);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Department not found.");
  }
  return row;
}

async function assertSubDepartmentBelongsToDepartment(
  subDepartmentId: number,
  departmentId: number,
) {
  const sub = await repo.getSubDepartmentById(subDepartmentId);
  if (!sub) {
    throw new ApiError(404, "NOT_FOUND", "Sub-department not found.");
  }
  if (sub.departmentId !== departmentId) {
    throw new ApiError(
      400,
      "SUB_DEPARTMENT_MISMATCH",
      "Sub-department does not belong to the selected department.",
    );
  }
  return sub;
}

async function resolveStructureLevel(designationId: number) {
  const designation = await repo.getDesignationById(designationId);
  if (!designation) {
    throw new ApiError(404, "NOT_FOUND", "Designation not found.");
  }
  return { levelId: designation.levelId, designation };
}

export async function listDepartments(filters: ListFilters = {}) {
  return repo.listDepartments(filters);
}

export async function getDepartment(id: number) {
  const row = await repo.getDepartmentById(id);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Department not found.");
  return row;
}

export async function createDepartment(input: CreateDepartmentInput) {
  try {
    return await repo.createDepartment(input);
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateDepartment(id: number, input: UpdateDepartmentInput) {
  await getDepartment(id);
  try {
    const row = await repo.updateDepartment(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Department not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function deleteDepartment(id: number) {
  await getDepartment(id);
  const subCount = await repo.countSubDepartmentsByDepartment(id);
  if (subCount > 0) {
    throw new ApiError(
      409,
      "HAS_CHILDREN",
      "Cannot delete department with sub-departments.",
    );
  }
  const structCount = await repo.countStructureByDepartment(id);
  if (structCount > 0) {
    throw new ApiError(
      409,
      "HAS_REFERENCES",
      "Cannot delete department referenced in hierarchy mappings.",
    );
  }
  try {
    const row = await repo.deleteDepartment(id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Department not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function listSubDepartments(filters: ListFilters = {}) {
  return repo.listSubDepartments(filters);
}

export async function getSubDepartment(id: number) {
  const row = await repo.getSubDepartmentById(id);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Sub-department not found.");
  return row;
}

export async function createSubDepartment(input: CreateSubDepartmentInput) {
  await assertDepartmentExists(input.departmentId);
  try {
    return await repo.createSubDepartment(input);
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateSubDepartment(
  id: number,
  input: UpdateSubDepartmentInput,
) {
  await getSubDepartment(id);
  if (input.departmentId !== undefined) {
    await assertDepartmentExists(input.departmentId);
  }
  try {
    const row = await repo.updateSubDepartment(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Sub-department not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function deleteSubDepartment(id: number) {
  await getSubDepartment(id);
  const structCount = await repo.countStructureBySubDepartment(id);
  if (structCount > 0) {
    throw new ApiError(
      409,
      "HAS_REFERENCES",
      "Cannot delete sub-department referenced in hierarchy mappings.",
    );
  }
  try {
    const row = await repo.deleteSubDepartment(id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Sub-department not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function listLevels(filters: ListFilters = {}) {
  return repo.listLevels(filters);
}

export async function getLevel(id: number) {
  const row = await repo.getLevelById(id);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Level not found.");
  return row;
}

export async function createLevel(input: CreateLevelInput) {
  try {
    return await repo.createLevel(input);
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateLevel(id: number, input: UpdateLevelInput) {
  await getLevel(id);
  try {
    const row = await repo.updateLevel(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Level not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function deleteLevel(id: number) {
  await getLevel(id);
  const refs =
    (await repo.countDesignationsByLevel(id)) +
    (await repo.countStructureByLevel(id));
  if (refs > 0) {
    throw new ApiError(
      409,
      "HAS_REFERENCES",
      "Cannot delete level referenced by designations or mappings.",
    );
  }
  try {
    const row = await repo.deleteLevel(id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Level not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function listDesignations(filters: ListFilters = {}) {
  return repo.listDesignations(filters);
}

export async function getDesignation(id: number) {
  const row = await repo.getDesignationById(id);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Designation not found.");
  return row;
}

export async function createDesignation(input: CreateDesignationInput) {
  await getLevel(input.levelId);
  try {
    return await repo.createDesignation(input);
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateDesignation(
  id: number,
  input: UpdateDesignationInput,
) {
  await getDesignation(id);
  if (input.levelId !== undefined) await getLevel(input.levelId);
  try {
    const row = await repo.updateDesignation(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Designation not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function deleteDesignation(id: number) {
  await getDesignation(id);
  const structCount = await repo.countStructureByDesignation(id);
  if (structCount > 0) {
    throw new ApiError(
      409,
      "HAS_REFERENCES",
      "Cannot delete designation referenced in hierarchy mappings.",
    );
  }
  try {
    const row = await repo.deleteDesignation(id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Designation not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function listStructure(filters: ListFilters = {}) {
  return repo.listStructure(filters);
}

export async function getStructure(id: number) {
  const row = await repo.getStructureById(id);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Structure mapping not found.");
  return row;
}

export async function createStructure(input: CreateStructureInput) {
  await assertDepartmentExists(input.departmentId);
  await assertSubDepartmentBelongsToDepartment(
    input.subDepartmentId,
    input.departmentId,
  );
  const { levelId } = await resolveStructureLevel(input.designationId);

  try {
    return await repo.createStructure({
      ...input,
      levelId,
    });
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateStructure(id: number, input: UpdateStructureInput) {
  const existing = await getStructure(id);
  const departmentId = input.departmentId ?? existing.departmentId;
  const subDepartmentId = input.subDepartmentId ?? existing.subDepartmentId;
  const designationId = input.designationId ?? existing.designationId;

  await assertDepartmentExists(departmentId);
  await assertSubDepartmentBelongsToDepartment(subDepartmentId, departmentId);
  const { levelId } = await resolveStructureLevel(designationId);

  try {
    const row = await repo.updateStructure(id, {
      ...input,
      levelId,
    });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Structure mapping not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function deleteStructure(id: number) {
  await getStructure(id);
  try {
    const row = await repo.deleteStructure(id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Structure mapping not found.");
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function getHierarchyTree() {
  const rows = await repo.listStructureWithJoins();
  return buildHierarchyTree(rows);
}

export async function getEmployeeReportingTree() {
  const rows = await repo.listEmployeesForReportingTree();
  return buildEmployeeReportingTree(rows);
}

// Re-export for tests
export { buildHierarchyTree } from "@/modules/org-hierarchy/services/org-hierarchy-tree";
export { buildEmployeeReportingTree } from "@/modules/org-hierarchy/services/employee-reporting-tree";
