import {
  fetchOrgDepartments,
  fetchOrgDesignations,
  fetchOrgLevels,
  fetchOrgStructure,
  fetchOrgSubDepartments,
  type OrgDepartment,
  type OrgDesignation,
  type OrgLevel,
  type OrgStructure,
  type OrgSubDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";

export type OrgHierarchyRoleLookups = {
  departments: OrgDepartment[];
  subDepartments: OrgSubDepartment[];
  designations: OrgDesignation[];
  levels: OrgLevel[];
  structures: OrgStructure[];
};

export type OrgHierarchyRoleDisplay = {
  department: string;
  subDepartment: string;
  designation: string;
  levelGrade: string;
};

const emptyOrgHierarchyRoleDisplay: OrgHierarchyRoleDisplay = {
  department: "—",
  subDepartment: "—",
  designation: "—",
  levelGrade: "—",
};

export function resolveOrgHierarchyRoleDisplay(
  structureId: number | null | undefined,
  lookups: OrgHierarchyRoleLookups,
): OrgHierarchyRoleDisplay {
  if (structureId == null) return emptyOrgHierarchyRoleDisplay;

  const structure = lookups.structures.find((row) => row.id === structureId);
  if (!structure) return emptyOrgHierarchyRoleDisplay;

  const department =
    lookups.departments.find((row) => row.id === structure.departmentId)
      ?.name ?? "—";
  const subDepartment =
    lookups.subDepartments.find((row) => row.id === structure.subDepartmentId)
      ?.name ?? "—";
  const designationRow = lookups.designations.find(
    (row) => row.id === structure.designationId,
  );
  const designation = designationRow?.name ?? "—";
  const level = designationRow
    ? lookups.levels.find((row) => row.id === designationRow.levelId)
    : undefined;
  const levelGrade = level ? `${level.code} — ${level.name}` : "—";

  return { department, subDepartment, designation, levelGrade };
}

export async function fetchOrgHierarchyRoleLookups(): Promise<OrgHierarchyRoleLookups> {
  const [departments, subDepartments, designations, levels, structures] =
    await Promise.all([
      fetchOrgDepartments(),
      fetchOrgSubDepartments(),
      fetchOrgDesignations(),
      fetchOrgLevels(),
      fetchOrgStructure(),
    ]);
  return { departments, subDepartments, designations, levels, structures };
}
