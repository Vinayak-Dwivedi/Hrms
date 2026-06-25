import type { StructureJoinRow } from "@/modules/org-hierarchy/repositories/org-hierarchy.repository";

export type HierarchyTreeRole = {
  structureId: number;
  designationId: number;
  designation: string;
  levelId: number;
  level: string;
  levelSortOrder: number;
};

export type HierarchyTreeSubDepartment = {
  id: number;
  name: string;
  roles: HierarchyTreeRole[];
};

export type HierarchyTreeDepartment = {
  id: number;
  name: string;
  code: string | null;
  subDepartments: HierarchyTreeSubDepartment[];
};

/**
 * Builds the department → sub-department → role tree. Seeds the tree with EVERY
 * department and sub-department first (so freshly-created ones that have no
 * structure mapping yet still appear), then attaches roles from the structure
 * rows. Previously the tree was built only from structure rows, so a new bare
 * department was invisible until it was fully mapped — which looked like the
 * "Add Department" action did nothing.
 */
export function buildHierarchyTree(
  structureRows: StructureJoinRow[],
  departments: Array<{ id: number; name: string; code: string | null }> = [],
  subDepartments: Array<{ id: number; name: string; departmentId: number }> = [],
): HierarchyTreeDepartment[] {
  const deptMap = new Map<number, HierarchyTreeDepartment>();
  const subMap = new Map<number, HierarchyTreeSubDepartment>();

  // 1. Seed every department.
  for (const d of departments) {
    deptMap.set(d.id, {
      id: d.id,
      name: d.name,
      code: d.code,
      subDepartments: [],
    });
  }

  // 2. Seed every sub-department under its parent department.
  for (const s of subDepartments) {
    const dept = deptMap.get(s.departmentId);
    if (!dept) continue;
    const sub: HierarchyTreeSubDepartment = { id: s.id, name: s.name, roles: [] };
    dept.subDepartments.push(sub);
    subMap.set(s.id, sub);
  }

  // 3. Attach roles from the structure mapping (creating dept/sub on the fly
  //    if a structure row references one not in the seed lists).
  for (const row of structureRows) {
    let dept = deptMap.get(row.departmentId);
    if (!dept) {
      dept = {
        id: row.departmentId,
        name: row.departmentName,
        code: row.departmentCode,
        subDepartments: [],
      };
      deptMap.set(row.departmentId, dept);
    }

    let sub = subMap.get(row.subDepartmentId);
    if (!sub) {
      sub = { id: row.subDepartmentId, name: row.subDepartmentName, roles: [] };
      dept.subDepartments.push(sub);
      subMap.set(row.subDepartmentId, sub);
    }

    sub.roles.push({
      structureId: row.structureId,
      designationId: row.designationId,
      designation: row.designationName,
      levelId: row.levelId,
      level: row.levelCode,
      levelSortOrder: row.levelSortOrder,
    });
  }

  for (const dept of deptMap.values()) {
    dept.subDepartments.sort((a, b) => a.name.localeCompare(b.name));
    for (const sub of dept.subDepartments) {
      sub.roles.sort((a, b) => {
        const diff = a.levelSortOrder - b.levelSortOrder;
        if (diff !== 0) return diff;
        return a.designation.localeCompare(b.designation);
      });
    }
  }

  return Array.from(deptMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
