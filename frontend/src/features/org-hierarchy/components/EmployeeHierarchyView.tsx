"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type {
  EmployeeReportingNode,
  EmployeeReportingTreeDepartment,
  OrgDepartment,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import HierarchyColumnTree, {
  type HierarchyColumn,
} from "@/features/org-hierarchy/components/HierarchyColumnTree";
import {
  findFirstSearchMatch,
} from "@/features/org-hierarchy/components/employee-hierarchy.utils";
import {
  employeeCardClass,
  employeeFilterLabelClass,
  employeeIconXs,
  employeeInputClass,
  employeeListTableEmptyClass,
} from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";

type Branch = { id: number; name: string };

// Only return roots that belong to the given location (or have no location assigned).
// If locationId is null, return all roots.
function rootsForLocation(
  locationId: number | null,
  roots: EmployeeReportingNode[],
): EmployeeReportingNode[] {
  if (locationId == null) return roots;
  return roots.filter((r) => r.branchId == null || r.branchId === locationId);
}

type Props = {
  tree: EmployeeReportingTreeDepartment[];
  branches?: Branch[];
  orgDepts?: OrgDepartment[];
};

type Path = {
  locationId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  employeeChain: number[];
};

function buildEmployeeColumns(
  roots: EmployeeReportingNode[],
  chain: number[],
  highlightedEmployeeId: number | null,
  onSelectEmployee: (employeeId: number, depth: number) => void,
): HierarchyColumn[] {
  const columns: HierarchyColumn[] = [];
  let currentNodes = roots;
  let depth = 0;

  while (currentNodes.length > 0) {
    const selectedId = chain[depth] ?? null;
    const columnId = `employees-${depth}`;

    columns.push({
      id: columnId,
      title: depth === 0 ? "Employees" : "Direct Reports",
      nodes: currentNodes.map((node) => ({
        id: `emp-${node.id}-${depth}`,
        kind: "employee" as const,
        title: node.name,
        subtitle: node.designation ?? node.levelCode ?? undefined,
        count: node.directReports.length,
        selected: node.id === selectedId,
        highlighted: node.id === highlightedEmployeeId,
        empId: node.empId,
        profilePhotoUrl: node.profilePhotoUrl ?? null,
        employeeId: node.id,
        onClick: () => onSelectEmployee(node.id, depth),
      })),
      emptyMessage: "No employees at this level.",
    });

    if (selectedId == null) break;
    const selected = currentNodes.find((n) => n.id === selectedId);
    if (!selected || selected.directReports.length === 0) break;
    currentNodes = selected.directReports;
    depth += 1;
  }

  return columns;
}

export default function EmployeeHierarchyView({
  tree,
  branches = [],
  orgDepts = [],
}: Props) {
  const [search, setSearch] = useState("");
  const [scrollToNodeId, setScrollToNodeId] = useState<string | null>(null);
  const [path, setPath] = useState<Path>({
    locationId: null,
    departmentId: null,
    subDepartmentId: null,
    employeeChain: [],
  });

  const treeById = useMemo(
    () => new Map(tree.map((d) => [d.id, d])),
    [tree],
  );

  const treeIds = useMemo(() => new Set(tree.map((d) => d.id)), [tree]);

  // Branches that have at least one department with employees in the tree.
  const activeLocations = useMemo(() => {
    if (branches.length === 0 || orgDepts.length === 0) return [];
    return branches.filter((b) =>
      orgDepts.some(
        (d) =>
          treeIds.has(d.id) &&
          (d.branchIds.length === 0 || d.branchIds.includes(b.id)),
      ),
    );
  }, [branches, orgDepts, treeIds]);

  // Auto-select first location on load.
  useEffect(() => {
    if (activeLocations.length === 0 || path.locationId != null) return;
    const first = activeLocations[0]!;
    const firstDeptId =
      orgDepts.find(
        (d) =>
          treeIds.has(d.id) &&
          (d.branchIds.length === 0 || d.branchIds.includes(first.id)),
      )?.id ?? null;
    const firstDept = firstDeptId ? treeById.get(firstDeptId) : null;
    const firstSubId = firstDept?.subDepartments[0]?.id ?? null;
    setPath({
      locationId: first.id,
      departmentId: firstDeptId,
      subDepartmentId: firstSubId,
      employeeChain: [],
    });
  }, [activeLocations, orgDepts, treeIds, treeById, path.locationId]);

  const searchMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return findFirstSearchMatch(tree, q);
  }, [tree, search]);

  useEffect(() => {
    if (!searchMatch) {
      setScrollToNodeId(null);
      return;
    }
    // Find the location that contains the matched department.
    const matchedOrgDept = orgDepts.find((d) => d.id === searchMatch.departmentId);
    let locationId = path.locationId;
    if (matchedOrgDept && matchedOrgDept.branchIds.length > 0) {
      locationId = matchedOrgDept.branchIds[0] ?? path.locationId;
    }
    setPath({
      locationId,
      departmentId: searchMatch.departmentId,
      subDepartmentId: searchMatch.subDepartmentId,
      employeeChain: searchMatch.employeeChain,
    });
    const depth = searchMatch.employeeChain.length - 1;
    setScrollToNodeId(`emp-${searchMatch.employeeId}-${depth}`);
  }, [searchMatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlightedEmployeeId = searchMatch?.employeeId ?? null;

  const columns = useMemo((): HierarchyColumn[] => {
    const result: HierarchyColumn[] = [];

    // ── Column 1: Locations ──────────────────────────────────────────────────
    if (activeLocations.length > 0) {
      result.push({
        id: "locations",
        title: "Location",
        nodes: activeLocations.map((loc) => {
          const deptCount = orgDepts.filter(
            (d) =>
              treeIds.has(d.id) &&
              (d.branchIds.length === 0 || d.branchIds.includes(loc.id)),
          ).length;
          return {
            id: `loc-${loc.id}`,
            kind: "department" as const,
            title: loc.name,
            count: deptCount,
            selected: loc.id === path.locationId,
            onClick: () =>
              setPath({
                locationId: loc.id,
                departmentId: null,
                subDepartmentId: null,
                employeeChain: [],
              }),
          };
        }),
        emptyMessage: "No locations with employees.",
      });
    }

    // ── Column 2: Departments in selected location ───────────────────────────
    const deptIdsInLocation =
      path.locationId == null
        ? // If no locations configured, show all departments.
          Array.from(treeIds)
        : orgDepts
            .filter(
              (d) =>
                treeIds.has(d.id) &&
                (d.branchIds.length === 0 ||
                  d.branchIds.includes(path.locationId!)),
            )
            .map((d) => d.id);

    const deptsInLocation = deptIdsInLocation
      .map((id) => treeById.get(id))
      .filter((d): d is EmployeeReportingTreeDepartment => d !== undefined);

    if (activeLocations.length > 0 && path.locationId == null) return result;

    result.push({
      id: "departments",
      title: "Department",
      nodes: deptsInLocation.map((dept) => {
        // Head = most senior root in the selected location across all sub-departments.
        let headName: string | undefined;
        for (const sub of dept.subDepartments) {
          const locRoots = rootsForLocation(path.locationId, sub.roots);
          if (locRoots.length > 0) {
            headName = locRoots[0]!.name;
            break;
          }
        }
        return {
          id: `dept-${dept.id}`,
          kind: "department" as const,
          title: dept.name,
          subtitle: headName,
          count: dept.subDepartments.length,
          selected: dept.id === path.departmentId,
          onClick: () =>
            setPath((prev) => ({
              ...prev,
              departmentId: dept.id,
              subDepartmentId: null,
              employeeChain: [],
            })),
        };
      }),
      emptyMessage: "No departments in this location.",
    });

    if (path.departmentId == null) return result;

    // ── Column 3: Sub Departments ────────────────────────────────────────────
    const selectedDept = treeById.get(path.departmentId);
    if (!selectedDept) return result;

    result.push({
      id: "sub-departments",
      title: "Sub Department",
      nodes: selectedDept.subDepartments.map((sub) => ({
        id: `sub-${sub.id}`,
        kind: "subDepartment" as const,
        title: sub.name,
        subtitle: rootsForLocation(path.locationId, sub.roots)[0]?.name,
        count: sub.roots.reduce(
          (n, r) => n + 1 + r.directReports.length,
          0,
        ),
        selected: sub.id === path.subDepartmentId,
        onClick: () =>
          setPath((prev) => ({
            ...prev,
            subDepartmentId: sub.id,
            employeeChain: [],
          })),
      })),
      emptyMessage: "No sub-departments in this department.",
    });

    if (path.subDepartmentId == null) return result;

    // ── Column 4+: Employees ─────────────────────────────────────────────────
    const selectedSub = selectedDept.subDepartments.find(
      (s) => s.id === path.subDepartmentId,
    );
    if (!selectedSub) return result;

    const employeeColumns = buildEmployeeColumns(
      selectedSub.roots,
      path.employeeChain,
      highlightedEmployeeId,
      (employeeId, depth) => {
        setPath((prev) => ({
          ...prev,
          employeeChain: [...prev.employeeChain.slice(0, depth), employeeId],
        }));
      },
    );

    return [...result, ...employeeColumns];
  }, [
    activeLocations,
    orgDepts,
    treeIds,
    treeById,
    path,
    highlightedEmployeeId,
  ]);

  const searchHasNoMatch = search.trim().length > 0 && !searchMatch;

  if (tree.length === 0) {
    return (
      <div className={`${employeeCardClass} overflow-hidden`}>
        <p className={employeeListTableEmptyClass}>
          No active employees found. Assign department roles on employee
          profiles and set reporting managers to build the hierarchy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-end">
        <div className="w-full sm:max-w-xs">
          <label
            className={employeeFilterLabelClass}
            htmlFor="hierarchy-search"
          >
            Search Employee
          </label>
          <div className="relative">
            <Search
              className={cn(
                employeeIconXs,
                "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
              )}
            />
            <input
              id="hierarchy-search"
              type="search"
              placeholder="Name or employee ID…"
              className={cn(employeeInputClass, "pl-9")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {searchHasNoMatch ? (
        <div className={`${employeeCardClass} overflow-hidden`}>
          <p className={employeeListTableEmptyClass}>
            No employees match &ldquo;{search.trim()}&rdquo;.
          </p>
        </div>
      ) : (
        <HierarchyColumnTree
          columns={columns}
          scrollToNodeId={scrollToNodeId}
        />
      )}
    </div>
  );
}
