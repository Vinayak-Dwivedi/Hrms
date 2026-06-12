import type { StructureJoinRow } from "@/modules/org-hierarchy/repositories/org-hierarchy.repository";



export type HierarchyTreeRole = {

  structureId: number;

  designationId: number;

  designation: string;

  levelId: number;

  level: string;

};



export type HierarchyTreeSubDepartment = {

  id: number;

  name: string;

  roles: HierarchyTreeRole[];

};



export type HierarchyTreeDepartment = {

  id: number;

  name: string;

  code: string;

  subDepartments: HierarchyTreeSubDepartment[];

};



export function buildHierarchyTree(

  rows: StructureJoinRow[],

): HierarchyTreeDepartment[] {

  const deptMap = new Map<number, HierarchyTreeDepartment>();



  for (const row of rows) {

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



    let sub = dept.subDepartments.find((s) => s.id === row.subDepartmentId);

    if (!sub) {

      sub = {

        id: row.subDepartmentId,

        name: row.subDepartmentName,

        roles: [],

      };

      dept.subDepartments.push(sub);

    }



    sub.roles.push({

      structureId: row.structureId,

      designationId: row.designationId,

      designation: row.designationName,

      levelId: row.levelId,

      level: row.levelCode,

    });

  }



  return Array.from(deptMap.values()).sort((a, b) =>

    a.name.localeCompare(b.name),

  );

}

