import { formatEmployeeFullName } from "@/lib/employee";
import type { EmployeeReportingTreeRow } from "@/modules/org-hierarchy/repositories/org-hierarchy.repository";

export const UNASSIGNED_DEPT_ID = 0;
export const UNASSIGNED_SUB_ID = 0;

export type EmployeeReportingNode = {
  id: number;
  empId: string;
  name: string;
  designation: string | null;
  levelCode: string | null;
  levelName: string | null;
  levelSortOrder: number | null;
  directReports: EmployeeReportingNode[];
};

export type EmployeeReportingTreeSubDepartment = {
  id: number;
  name: string;
  roots: EmployeeReportingNode[];
};

export type EmployeeReportingTreeDepartment = {
  id: number;
  name: string;
  code: string;
  subDepartments: EmployeeReportingTreeSubDepartment[];
};

function sortNodes(nodes: EmployeeReportingNode[]): EmployeeReportingNode[] {
  return [...nodes].sort((a, b) => {
    const aSort = a.levelSortOrder ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.levelSortOrder ?? Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;
    const desig = (a.designation ?? "").localeCompare(b.designation ?? "");
    if (desig !== 0) return desig;
    return a.name.localeCompare(b.name);
  });
}

function buildSubtree(
  employeeId: number,
  byId: Map<number, EmployeeReportingTreeRow>,
  groupMemberIds: Set<number>,
): EmployeeReportingNode {
  const emp = byId.get(employeeId)!;
  const children = [...groupMemberIds]
    .filter((id) => byId.get(id)?.reportingManagerId === employeeId)
    .map((id) => buildSubtree(id, byId, groupMemberIds));

  return {
    id: emp.employeeId,
    empId: emp.empId,
    name: formatEmployeeFullName({
      firstName: emp.firstName,
      middleName: emp.middleName,
      lastName: emp.lastName,
    }),
    designation: emp.designationName,
    levelCode: emp.levelCode,
    levelName: emp.levelName,
    levelSortOrder: emp.levelSortOrder,
    directReports: sortNodes(children),
  };
}

function buildForestForGroup(
  employees: EmployeeReportingTreeRow[],
): EmployeeReportingNode[] {
  const memberIds = new Set(employees.map((e) => e.employeeId));
  const byId = new Map(employees.map((e) => [e.employeeId, e]));

  const roots = employees.filter(
    (e) =>
      e.reportingManagerId == null || !memberIds.has(e.reportingManagerId),
  );

  return sortNodes(
    roots.map((r) => buildSubtree(r.employeeId, byId, memberIds)),
  );
}

type SubBucket = {
  id: number;
  name: string;
  employees: EmployeeReportingTreeRow[];
};

type DeptBucket = {
  id: number;
  name: string;
  code: string;
  subs: Map<number, SubBucket>;
};

export function buildEmployeeReportingTree(
  rows: EmployeeReportingTreeRow[],
): EmployeeReportingTreeDepartment[] {
  const deptBuckets = new Map<number, DeptBucket>();

  for (const row of rows) {
    const isUnassigned =
      row.departmentId == null || row.subDepartmentId == null;
    const deptId = isUnassigned ? UNASSIGNED_DEPT_ID : row.departmentId;
    const subId = isUnassigned ? UNASSIGNED_SUB_ID : row.subDepartmentId;

    if (!deptBuckets.has(deptId)) {
      deptBuckets.set(deptId, {
        id: deptId,
        name: isUnassigned ? "Unassigned" : row.departmentName!,
        code: isUnassigned ? "UNASSIGNED" : row.departmentCode!,
        subs: new Map(),
      });
    }

    const dept = deptBuckets.get(deptId)!;
    if (!dept.subs.has(subId)) {
      dept.subs.set(subId, {
        id: subId,
        name: isUnassigned ? "Unassigned" : row.subDepartmentName!,
        employees: [],
      });
    }
    dept.subs.get(subId)!.employees.push(row);
  }

  const sortedDepts = [...deptBuckets.values()].sort((a, b) => {
    if (a.id === UNASSIGNED_DEPT_ID) return 1;
    if (b.id === UNASSIGNED_DEPT_ID) return -1;
    return a.name.localeCompare(b.name);
  });

  return sortedDepts.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    subDepartments: [...dept.subs.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        roots: buildForestForGroup(sub.employees),
      })),
  }));
}
