import { and, asc, count, eq, type SQL } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  orgHierarchyDepartments,
  orgHierarchyDesignations,
  orgHierarchyLevels,
  orgHierarchyStructure,
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

  return db
    .select()
    .from(orgHierarchyDepartments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgHierarchyDepartments.name))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);
}

export async function getDepartmentById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchyDepartments)
    .where(eq(orgHierarchyDepartments.id, id))
    .limit(1);
  return row ?? null;
}

export async function createDepartment(input: CreateDepartmentInput) {
  const [row] = await db
    .insert(orgHierarchyDepartments)
    .values({
      name: input.name,
      code: input.code,
      status: input.status ?? "Active",
      companyId: input.companyId ?? null,
    })
    .returning();
  return row!;
}

export async function updateDepartment(id: number, input: UpdateDepartmentInput) {
  const [row] = await db
    .update(orgHierarchyDepartments)
    .set(input)
    .where(eq(orgHierarchyDepartments.id, id))
    .returning();
  return row ?? null;
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

  return db
    .select()
    .from(orgHierarchySubDepartments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgHierarchySubDepartments.name))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);
}

export async function getSubDepartmentById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchySubDepartments)
    .where(eq(orgHierarchySubDepartments.id, id))
    .limit(1);
  return row ?? null;
}

export async function createSubDepartment(input: CreateSubDepartmentInput) {
  const [row] = await db
    .insert(orgHierarchySubDepartments)
    .values({
      departmentId: input.departmentId,
      name: input.name,
      status: input.status ?? "Active",
      companyId: input.companyId ?? null,
    })
    .returning();
  return row!;
}

export async function updateSubDepartment(
  id: number,
  input: UpdateSubDepartmentInput,
) {
  const [row] = await db
    .update(orgHierarchySubDepartments)
    .set(input)
    .where(eq(orgHierarchySubDepartments.id, id))
    .returning();
  return row ?? null;
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

  return db
    .select()
    .from(orgHierarchyDesignations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgHierarchyDesignations.name))
    .limit(filters.limit ?? DEFAULT_LIST_LIMIT)
    .offset(filters.offset ?? 0);
}

export async function getDesignationById(id: number) {
  const [row] = await db
    .select()
    .from(orgHierarchyDesignations)
    .where(eq(orgHierarchyDesignations.id, id))
    .limit(1);
  return row ?? null;
}

export async function createDesignation(input: CreateDesignationInput) {
  const [row] = await db
    .insert(orgHierarchyDesignations)
    .values({
      name: input.name,
      code: input.code ?? null,
      levelId: input.levelId,
      status: input.status ?? "Active",
    })
    .returning();
  return row!;
}

export async function updateDesignation(
  id: number,
  input: UpdateDesignationInput,
) {
  const [row] = await db
    .update(orgHierarchyDesignations)
    .set(input)
    .where(eq(orgHierarchyDesignations.id, id))
    .returning();
  return row ?? null;
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
