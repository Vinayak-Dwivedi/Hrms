import type {
  EmployeeReportingNode,
  EmployeeReportingTreeDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";

export type SelectionPath = {
  departmentId: number | null;
  subDepartmentId: number | null;
  employeeChain: number[];
};

export function countSubtree(node: EmployeeReportingNode): number {
  return (
    1 +
    node.directReports.reduce((sum, child) => sum + countSubtree(child), 0)
  );
}

export function countGroupEmployees(roots: EmployeeReportingNode[]): number {
  return roots.reduce((sum, root) => sum + countSubtree(root), 0);
}

export function countDepartmentEmployees(
  dept: EmployeeReportingTreeDepartment,
): number {
  return dept.subDepartments.reduce(
    (sum, sub) => sum + countGroupEmployees(sub.roots),
    0,
  );
}

export function nodeMatchesSearch(
  node: EmployeeReportingNode,
  query: string,
): boolean {
  const haystack = [node.name, node.empId, node.designation ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function findEmployeeNode(
  roots: EmployeeReportingNode[],
  employeeId: number,
): EmployeeReportingNode | null {
  for (const root of roots) {
    if (root.id === employeeId) return root;
    const found = findEmployeeNode(root.directReports, employeeId);
    if (found) return found;
  }
  return null;
}

export function findAncestorChain(
  roots: EmployeeReportingNode[],
  targetId: number,
  chain: number[] = [],
): number[] | null {
  for (const node of roots) {
    const path = [...chain, node.id];
    if (node.id === targetId) return path;
    const found = findAncestorChain(node.directReports, targetId, path);
    if (found) return found;
  }
  return null;
}

export type EmployeeSearchMatch = {
  departmentId: number;
  subDepartmentId: number;
  employeeChain: number[];
  employeeId: number;
};

export function findFirstSearchMatch(
  tree: EmployeeReportingTreeDepartment[],
  query: string,
): EmployeeSearchMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  for (const dept of tree) {
    for (const sub of dept.subDepartments) {
      const chain = findFirstMatchInForest(sub.roots, q);
      if (chain) {
        return {
          departmentId: dept.id,
          subDepartmentId: sub.id,
          employeeChain: chain,
          employeeId: chain[chain.length - 1]!,
        };
      }
    }
  }
  return null;
}

function findFirstMatchInForest(
  nodes: EmployeeReportingNode[],
  query: string,
  ancestors: number[] = [],
): number[] | null {
  for (const node of nodes) {
    const path = [...ancestors, node.id];
    if (nodeMatchesSearch(node, query)) return path;
    const childMatch = findFirstMatchInForest(
      node.directReports,
      query,
      path,
    );
    if (childMatch) return childMatch;
  }
  return null;
}

export function getEmployeeAtChain(
  roots: EmployeeReportingNode[],
  chain: number[],
): EmployeeReportingNode | null {
  if (chain.length === 0) return null;
  let current: EmployeeReportingNode | undefined;
  let level = roots;
  for (const id of chain) {
    current = level.find((n) => n.id === id);
    if (!current) return null;
    level = current.directReports;
  }
  return current ?? null;
}

export function initialSelectionPath(
  tree: EmployeeReportingTreeDepartment[],
): SelectionPath {
  const firstDept = tree[0];
  if (!firstDept) {
    return { departmentId: null, subDepartmentId: null, employeeChain: [] };
  }
  const firstSub = firstDept.subDepartments[0];
  return {
    departmentId: firstDept.id,
    subDepartmentId: firstSub?.id ?? null,
    employeeChain: [],
  };
}
