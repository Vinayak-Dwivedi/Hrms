import { and, asc, count, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  orgHierarchyDepartmentBranches,
  orgHierarchyDepartments,
  orgHierarchyDesignationBranches,
  orgHierarchyDesignations,
  orgHierarchyLevels,
  orgHierarchyStructure,
  orgHierarchySubDepartmentBranches,
  orgHierarchySubDepartments,
} from "@/db/schema/hrms";
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
import { DEFAULT_LIST_LIMIT } from "@/modules/org-hierarchy/constants";

type ListFilters = {
  limit?: number;
  offset?: number;
  status?: "Active" | "Inactive";
  departmentId?: number;
  levelId?: number;
  companyId?: number;
};

function companyFilter(companyId?: number): SQL | undefined {
  if (companyId === undefined) return undefined;
  return eq(orgHierarchyDepartments.companyId, companyId);
}

export async function listDepartments(filters: ListFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.status) {
    conditions.push(eq(orgHierarchyDepartments.status, filters.status));
  }
  const company = companyFilter(filters.companyId);
  if (company) conditions.push(company);

  const rows = await db
    .select()
    .from(orgHierarchyDepartments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgHierarchyDepartments.name))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);

  const branchMap = await loadBranchIdsByDepartment(rows.map((r) => r.id));
  return rows.map((row) => ({
    ...row,
    branchIds: branchMap.get(row.id) ?? [],
  }));
}

export async function getDepartmentById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchyDepartments)
    .where(eq(orgHierarchyDepartments.id, id))
    .limit(1);
  if (!row) return null;
  const branchIds = await listDepartmentBranchIds(id);
  return { ...row, branchIds };
}

async function listDepartmentBranchIds(departmentId: number): Promise<number[]> {
  const rows = await db
    .select({ branchId: orgHierarchyDepartmentBranches.branchId })
    .from(orgHierarchyDepartmentBranches)
    .where(eq(orgHierarchyDepartmentBranches.departmentId, departmentId));
  return rows.map((r) => r.branchId);
}

async function loadBranchIdsByDepartment(
  departmentIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (departmentIds.length === 0) return map;

  const rows = await db
    .select({
      departmentId: orgHierarchyDepartmentBranches.departmentId,
      branchId: orgHierarchyDepartmentBranches.branchId,
    })
    .from(orgHierarchyDepartmentBranches)
    .where(
      inArray(orgHierarchyDepartmentBranches.departmentId, departmentIds),
    );

  for (const row of rows) {
    const list = map.get(row.departmentId) ?? [];
    list.push(row.branchId);
    map.set(row.departmentId, list);
  }
  return map;
}

export async function createDepartment(input: CreateDepartmentInput) {
  const { branchIds = [], ...rowInput } = input;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(orgHierarchyDepartments)
      .values({
        name: rowInput.name,
        code: rowInput.code,
        status: rowInput.status ?? "Active",
        companyId: rowInput.companyId ?? null,
      })
      .returning();
    if (branchIds.length > 0) {
      await tx.insert(orgHierarchyDepartmentBranches).values(
        branchIds.map((branchId) => ({
          departmentId: row!.id,
          branchId,
        })),
      );
    }
    return { ...row!, branchIds };
  });
}

export async function updateDepartment(id: number, input: UpdateDepartmentInput) {
  const { branchIds, ...rowInput } = input;
  return db.transaction(async (tx) => {
    const hasRowPatch = Object.keys(rowInput).length > 0;
    let row =
      hasRowPatch
        ? (
            await tx
              .update(orgHierarchyDepartments)
              .set(rowInput)
              .where(eq(orgHierarchyDepartments.id, id))
              .returning()
          )[0]
        : (
            await tx
              .select()
              .from(orgHierarchyDepartments)
              .where(eq(orgHierarchyDepartments.id, id))
              .limit(1)
          )[0];

    if (!row) return null;

    if (branchIds !== undefined) {
      await tx
        .delete(orgHierarchyDepartmentBranches)
        .where(eq(orgHierarchyDepartmentBranches.departmentId, id));
      if (branchIds.length > 0) {
        await tx.insert(orgHierarchyDepartmentBranches).values(
          branchIds.map((branchId) => ({
            departmentId: id,
            branchId,
          })),
        );
      }
    }

    const resolvedBranchIds =
      branchIds !== undefined
        ? branchIds
        : (
            await tx
              .select({
                branchId: orgHierarchyDepartmentBranches.branchId,
              })
              .from(orgHierarchyDepartmentBranches)
              .where(eq(orgHierarchyDepartmentBranches.departmentId, id))
          ).map((r) => r.branchId);

    return { ...row, branchIds: resolvedBranchIds };
  });
}

export async function deleteDepartment(id: number) {
  const [row] = await db
    .delete(orgHierarchyDepartments)
    .where(eq(orgHierarchyDepartments.id, id))
    .returning({ id: orgHierarchyDepartments.id });
  return row ?? null;
}

export async function countSubDepartmentsByDepartment(departmentId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(orgHierarchySubDepartments)
    .where(eq(orgHierarchySubDepartments.departmentId, departmentId));
  return row?.total ?? 0;
}

export async function countStructureByDepartment(departmentId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.departmentId, departmentId));
  return row?.total ?? 0;
}

export async function listSubDepartments(filters: ListFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.departmentId) {
    conditions.push(
      eq(orgHierarchySubDepartments.departmentId, filters.departmentId),
    );
  }
  if (filters.status) {
    conditions.push(eq(orgHierarchySubDepartments.status, filters.status));
  }

  const rows = await db
    .select()
    .from(orgHierarchySubDepartments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgHierarchySubDepartments.name))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);

  const branchMap = await loadBranchIdsBySubDepartment(
    rows.map((r) => r.id),
  );
  return rows.map((row) => ({
    ...row,
    branchIds: branchMap.get(row.id) ?? [],
  }));
}

export async function getSubDepartmentById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchySubDepartments)
    .where(eq(orgHierarchySubDepartments.id, id))
    .limit(1);
  if (!row) return null;
  const branchIds = await listSubDepartmentBranchIds(id);
  return { ...row, branchIds };
}

export async function listSubDepartmentBranchIds(
  subDepartmentId: number,
): Promise<number[]> {
  const rows = await db
    .select({ branchId: orgHierarchySubDepartmentBranches.branchId })
    .from(orgHierarchySubDepartmentBranches)
    .where(
      eq(
        orgHierarchySubDepartmentBranches.subDepartmentId,
        subDepartmentId,
      ),
    );
  return rows.map((r) => r.branchId);
}

async function loadBranchIdsBySubDepartment(
  subDepartmentIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (subDepartmentIds.length === 0) return map;

  const rows = await db
    .select({
      subDepartmentId: orgHierarchySubDepartmentBranches.subDepartmentId,
      branchId: orgHierarchySubDepartmentBranches.branchId,
    })
    .from(orgHierarchySubDepartmentBranches)
    .where(
      inArray(
        orgHierarchySubDepartmentBranches.subDepartmentId,
        subDepartmentIds,
      ),
    );

  for (const row of rows) {
    const list = map.get(row.subDepartmentId) ?? [];
    list.push(row.branchId);
    map.set(row.subDepartmentId, list);
  }
  return map;
}

export async function setSubDepartmentBranches(
  subDepartmentId: number,
  branchIds: number[],
) {
  await db
    .delete(orgHierarchySubDepartmentBranches)
    .where(
      eq(
        orgHierarchySubDepartmentBranches.subDepartmentId,
        subDepartmentId,
      ),
    );
  if (branchIds.length === 0) return;
  await db.insert(orgHierarchySubDepartmentBranches).values(
    branchIds.map((branchId) => ({
      subDepartmentId,
      branchId,
    })),
  );
}

export async function createSubDepartment(input: CreateSubDepartmentInput) {
  const { branchIds = [], ...rowInput } = input;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(orgHierarchySubDepartments)
      .values({
        departmentId: rowInput.departmentId,
        name: rowInput.name,
        status: rowInput.status ?? "Active",
        companyId: rowInput.companyId ?? null,
      })
      .returning();
    if (branchIds.length > 0) {
      await tx.insert(orgHierarchySubDepartmentBranches).values(
        branchIds.map((branchId) => ({
          subDepartmentId: row!.id,
          branchId,
        })),
      );
    }
    return { ...row!, branchIds };
  });
}

export async function updateSubDepartment(
  id: number,
  input: UpdateSubDepartmentInput,
) {
  const { branchIds, ...rowInput } = input;
  return db.transaction(async (tx) => {
    const hasRowPatch = Object.keys(rowInput).length > 0;
    let row =
      hasRowPatch
        ? (
            await tx
              .update(orgHierarchySubDepartments)
              .set(rowInput)
              .where(eq(orgHierarchySubDepartments.id, id))
              .returning()
          )[0]
        : (
            await tx
              .select()
              .from(orgHierarchySubDepartments)
              .where(eq(orgHierarchySubDepartments.id, id))
              .limit(1)
          )[0];

    if (!row) return null;

    if (branchIds !== undefined) {
      await tx
        .delete(orgHierarchySubDepartmentBranches)
        .where(
          eq(
            orgHierarchySubDepartmentBranches.subDepartmentId,
            id,
          ),
        );
      if (branchIds.length > 0) {
        await tx.insert(orgHierarchySubDepartmentBranches).values(
          branchIds.map((branchId) => ({
            subDepartmentId: id,
            branchId,
          })),
        );
      }
    }

    const resolvedBranchIds =
      branchIds !== undefined
        ? branchIds
        : (
            await tx
              .select({
                branchId: orgHierarchySubDepartmentBranches.branchId,
              })
              .from(orgHierarchySubDepartmentBranches)
              .where(
                eq(
                  orgHierarchySubDepartmentBranches.subDepartmentId,
                  id,
                ),
              )
          ).map((r) => r.branchId);

    return { ...row, branchIds: resolvedBranchIds };
  });
}

export async function deleteSubDepartment(id: number) {
  const [row] = await db
    .delete(orgHierarchySubDepartments)
    .where(eq(orgHierarchySubDepartments.id, id))
    .returning({ id: orgHierarchySubDepartments.id });
  return row ?? null;
}

export async function countStructureBySubDepartment(subDepartmentId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.subDepartmentId, subDepartmentId));
  return row?.total ?? 0;
}

export async function listLevels(filters: ListFilters = {}) {
  return db
    .select()
    .from(orgHierarchyLevels)
    .orderBy(asc(orgHierarchyLevels.sortOrder), asc(orgHierarchyLevels.code))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);
}

export async function getLevelById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchyLevels)
    .where(eq(orgHierarchyLevels.id, id))
    .limit(1);
  return row ?? null;
}

export async function createLevel(input: CreateLevelInput) {
  const [row] = await db
    .insert(orgHierarchyLevels)
    .values({
      code: input.code,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row!;
}

export async function updateLevel(id: number, input: UpdateLevelInput) {
  const [row] = await db
    .update(orgHierarchyLevels)
    .set(input)
    .where(eq(orgHierarchyLevels.id, id))
    .returning();
  return row ?? null;
}

export async function deleteLevel(id: number) {
  const [row] = await db
    .delete(orgHierarchyLevels)
    .where(eq(orgHierarchyLevels.id, id))
    .returning({ id: orgHierarchyLevels.id });
  return row ?? null;
}

export async function countDesignationsByLevel(levelId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(orgHierarchyDesignations)
    .where(eq(orgHierarchyDesignations.levelId, levelId));
  return row?.total ?? 0;
}

export async function countStructureByLevel(levelId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.levelId, levelId));
  return row?.total ?? 0;
}

export async function listDesignations(filters: ListFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.status) {
    conditions.push(eq(orgHierarchyDesignations.status, filters.status));
  }
  if (filters.levelId) {
    conditions.push(eq(orgHierarchyDesignations.levelId, filters.levelId));
  }

  const rows = await db
    .select()
    .from(orgHierarchyDesignations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgHierarchyDesignations.name))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);

  const branchMap = await loadBranchIdsByDesignation(rows.map((r) => r.id));
  return rows.map((row) => ({
    ...row,
    branchIds: branchMap.get(row.id) ?? [],
  }));
}

export async function getDesignationById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchyDesignations)
    .where(eq(orgHierarchyDesignations.id, id))
    .limit(1);
  if (!row) return null;
  const branchIds = await listDesignationBranchIds(id);
  return { ...row, branchIds };
}

async function listDesignationBranchIds(designationId: number): Promise<number[]> {
  const rows = await db
    .select({ branchId: orgHierarchyDesignationBranches.branchId })
    .from(orgHierarchyDesignationBranches)
    .where(eq(orgHierarchyDesignationBranches.designationId, designationId));
  return rows.map((r) => r.branchId);
}

async function loadBranchIdsByDesignation(
  designationIds: number[],
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (designationIds.length === 0) return map;

  const rows = await db
    .select({
      designationId: orgHierarchyDesignationBranches.designationId,
      branchId: orgHierarchyDesignationBranches.branchId,
    })
    .from(orgHierarchyDesignationBranches)
    .where(
      inArray(orgHierarchyDesignationBranches.designationId, designationIds),
    );

  for (const row of rows) {
    const list = map.get(row.designationId) ?? [];
    list.push(row.branchId);
    map.set(row.designationId, list);
  }
  return map;
}

export async function createDesignation(input: CreateDesignationInput) {
  const { branchIds = [], ...rowInput } = input;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(orgHierarchyDesignations)
      .values({
        name: rowInput.name,
        code: rowInput.code ?? null,
        levelId: rowInput.levelId,
        status: rowInput.status ?? "Active",
      })
      .returning();
    if (branchIds.length > 0) {
      await tx.insert(orgHierarchyDesignationBranches).values(
        branchIds.map((branchId) => ({
          designationId: row!.id,
          branchId,
        })),
      );
    }
    return { ...row!, branchIds };
  });
}

export async function updateDesignation(
  id: number,
  input: UpdateDesignationInput,
) {
  const { branchIds, ...rowInput } = input;
  return db.transaction(async (tx) => {
    const hasRowPatch = Object.keys(rowInput).length > 0;
    let row =
      hasRowPatch
        ? (
            await tx
              .update(orgHierarchyDesignations)
              .set(rowInput)
              .where(eq(orgHierarchyDesignations.id, id))
              .returning()
          )[0]
        : (
            await tx
              .select()
              .from(orgHierarchyDesignations)
              .where(eq(orgHierarchyDesignations.id, id))
              .limit(1)
          )[0];

    if (!row) return null;

    if (branchIds !== undefined) {
      await tx
        .delete(orgHierarchyDesignationBranches)
        .where(eq(orgHierarchyDesignationBranches.designationId, id));
      if (branchIds.length > 0) {
        await tx.insert(orgHierarchyDesignationBranches).values(
          branchIds.map((branchId) => ({
            designationId: id,
            branchId,
          })),
        );
      }
    }

    const resolvedBranchIds =
      branchIds !== undefined
        ? branchIds
        : (
            await tx
              .select({
                branchId: orgHierarchyDesignationBranches.branchId,
              })
              .from(orgHierarchyDesignationBranches)
              .where(eq(orgHierarchyDesignationBranches.designationId, id))
          ).map((r) => r.branchId);

    return { ...row, branchIds: resolvedBranchIds };
  });
}

export async function deleteDesignation(id: number) {
  const [row] = await db
    .delete(orgHierarchyDesignations)
    .where(eq(orgHierarchyDesignations.id, id))
    .returning({ id: orgHierarchyDesignations.id });
  return row ?? null;
}

export async function countStructureByDesignation(designationId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.designationId, designationId));
  return row?.total ?? 0;
}

export async function listStructure(filters: ListFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.departmentId) {
    conditions.push(eq(orgHierarchyStructure.departmentId, filters.departmentId));
  }

  return db
    .select()
    .from(orgHierarchyStructure)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgHierarchyStructure.id))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);
}

export async function getStructureById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.id, id))
    .limit(1);
  return row ?? null;
}

export async function createStructure(input: {
  departmentId: number;
  subDepartmentId: number;
  designationId: number;
  levelId: number;
  companyId?: number | null;
}) {
  const [row] = await db
    .insert(orgHierarchyStructure)
    .values({
      departmentId: input.departmentId,
      subDepartmentId: input.subDepartmentId,
      designationId: input.designationId,
      levelId: input.levelId,
      companyId: input.companyId ?? null,
    })
    .returning();
  return row!;
}

export async function updateStructure(id: number, input: UpdateStructureInput & { levelId?: number }) {
  const [row] = await db
    .update(orgHierarchyStructure)
    .set(input)
    .where(eq(orgHierarchyStructure.id, id))
    .returning();
  return row ?? null;
}

export async function deleteStructure(id: number) {
  const [row] = await db
    .delete(orgHierarchyStructure)
    .where(eq(orgHierarchyStructure.id, id))
    .returning({ id: orgHierarchyStructure.id });
  return row ?? null;
}

export type StructureJoinRow = {
  structureId: number;
  departmentId: number;
  departmentName: string;
  departmentCode: string;
  subDepartmentId: number;
  subDepartmentName: string;
  designationId: number;
  designationName: string;
  levelId: number;
  levelCode: string;
};

export async function listStructureWithJoins(): Promise<StructureJoinRow[]> {
  const rows = await db
    .select({
      structureId: orgHierarchyStructure.id,
      departmentId: orgHierarchyDepartments.id,
      departmentName: orgHierarchyDepartments.name,
      departmentCode: orgHierarchyDepartments.code,
      subDepartmentId: orgHierarchySubDepartments.id,
      subDepartmentName: orgHierarchySubDepartments.name,
      designationId: orgHierarchyDesignations.id,
      designationName: orgHierarchyDesignations.name,
      levelId: orgHierarchyLevels.id,
      levelCode: orgHierarchyLevels.code,
    })
    .from(orgHierarchyStructure)
    .innerJoin(
      orgHierarchyDepartments,
      eq(orgHierarchyStructure.departmentId, orgHierarchyDepartments.id),
    )
    .innerJoin(
      orgHierarchySubDepartments,
      eq(orgHierarchyStructure.subDepartmentId, orgHierarchySubDepartments.id),
    )
    .innerJoin(
      orgHierarchyDesignations,
      eq(orgHierarchyStructure.designationId, orgHierarchyDesignations.id),
    )
    .innerJoin(
      orgHierarchyLevels,
      eq(orgHierarchyStructure.levelId, orgHierarchyLevels.id),
    )
    .orderBy(
      asc(orgHierarchyDepartments.name),
      asc(orgHierarchySubDepartments.name),
      asc(orgHierarchyDesignations.name),
    );

  return rows;
}

export type EmployeeReportingTreeRow = {
  employeeId: number;
  empId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  profilePhotoUrl: string | null;
  reportingManagerId: number | null;
  departmentId: number | null;
  departmentName: string | null;
  departmentCode: string | null;
  subDepartmentId: number | null;
  subDepartmentName: string | null;
  designationName: string | null;
  levelCode: string | null;
  levelName: string | null;
  levelSortOrder: number | null;
};

export async function listEmployeesForReportingTree(): Promise<
  EmployeeReportingTreeRow[]
> {
  return db
    .select({
      employeeId: employees.id,
      empId: employees.empId,
      firstName: employees.firstName,
      middleName: employees.middleName,
      lastName: employees.lastName,
      profilePhotoUrl: employees.profilePhotoUrl,
      reportingManagerId: employees.reportingManagerId,
      departmentId: orgHierarchyDepartments.id,
      departmentName: orgHierarchyDepartments.name,
      departmentCode: orgHierarchyDepartments.code,
      subDepartmentId: orgHierarchySubDepartments.id,
      subDepartmentName: orgHierarchySubDepartments.name,
      designationName: orgHierarchyDesignations.name,
      levelCode: orgHierarchyLevels.code,
      levelName: orgHierarchyLevels.name,
      levelSortOrder: orgHierarchyLevels.sortOrder,
    })
    .from(employees)
    .leftJoin(
      orgHierarchyStructure,
      eq(employees.orgHierarchyStructureId, orgHierarchyStructure.id),
    )
    .leftJoin(
      orgHierarchyDepartments,
      eq(orgHierarchyStructure.departmentId, orgHierarchyDepartments.id),
    )
    .leftJoin(
      orgHierarchySubDepartments,
      eq(orgHierarchyStructure.subDepartmentId, orgHierarchySubDepartments.id),
    )
    .leftJoin(
      orgHierarchyDesignations,
      eq(orgHierarchyStructure.designationId, orgHierarchyDesignations.id),
    )
    .leftJoin(
      orgHierarchyLevels,
      eq(orgHierarchyStructure.levelId, orgHierarchyLevels.id),
    )
    .where(eq(employees.employeeStatus, "Active"))
    .orderBy(
      asc(orgHierarchyDepartments.name),
      asc(orgHierarchySubDepartments.name),
      asc(employees.lastName),
    );
}
