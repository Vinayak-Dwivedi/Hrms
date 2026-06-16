"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Search } from "lucide-react";
import type {
  EmployeeReportingNode,
  EmployeeReportingTreeDepartment,
  OrgLevel,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
import HierarchyColumnTree, {
  type HierarchyColumn,
} from "@/features/org-hierarchy/components/HierarchyColumnTree";
import {
  countDepartmentEmployees,
  countGroupEmployees,
  findFirstSearchMatch,
  type SelectionPath,
} from "@/features/org-hierarchy/components/employee-hierarchy.utils";
import {
  employeeCardClass,
  employeeFilterLabelClass,
  employeeIconXs,
  employeeInputClass,
  employeeListTableEmptyClass,
} from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";

type Props = {
  tree: EmployeeReportingTreeDepartment[];
  levels?: OrgLevel[];
};

type HodAnchor = {
  departmentId: number;
  departmentName: string;
  departmentCode: string;
  subDepartmentId: number;
  subDepartmentName: string;
  root: EmployeeReportingNode;
};

function levelTierClass(sortOrder: number | null): string {
  if (sortOrder == null) {
    return "border-gray-200 bg-gray-50 text-gray-600";
  }
  if (sortOrder <= 2) {
    return "border-indigo-200 bg-indigo-50 text-indigo-800";
  }
  if (sortOrder <= 4) {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function HierarchyGuide({ levels }: { levels: OrgLevel[] }) {
  const sortedLevels = [...levels].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 text-[12px] text-gray-700">
      <div className="flex items-start gap-2">
        <Info className={cn(employeeIconXs, "text-blue-600 mt-0.5 shrink-0")} />
        <div className="space-y-2 min-w-0">
          <p className="font-medium text-gray-900">How to read this hierarchy</p>
          <ul className="list-disc pl-4 space-y-1 text-gray-600">
            <li>
              View data like this: <strong>HOD name</strong>, then{" "}
              <strong>Department</strong>, then <strong>Sub Department</strong>,
              then <strong>Assign Employee</strong>.
            </li>
            <li>
              Selecting HOD name or employee opens <strong>Assign Employee</strong>{" "}
              and shows direct reports only.
            </li>
            <li>
              Use the profile link icon on an employee card to open their full
              profile.
            </li>
          </ul>
          {sortedLevels.length > 0 && (
            <div className="pt-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Level order (high → low)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sortedLevels.map((level) => (
                  <span
                    key={level.id}
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                      levelTierClass(level.sortOrder),
                    )}
                  >
                    {level.name} ({level.code})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
    const columnId = depth === 0 ? "roots" : `reports-${depth}`;

    columns.push({
      id: columnId,
      title: "Assign Employee",
      nodes: currentNodes.map((node) => ({
        id: `emp-${node.id}-${depth}`,
        kind: "employee" as const,
        title: node.name,
        subtitle: node.designation ?? "HOD name",
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

export default function EmployeeHierarchyView({ tree, levels = [] }: Props) {
  const [search, setSearch] = useState("");
  const [path, setPath] = useState<SelectionPath>({
    departmentId: null,
    subDepartmentId: null,
    employeeChain: [],
  });
  const [selectedHodId, setSelectedHodId] = useState<number | null>(null);
  const [scrollToNodeId, setScrollToNodeId] = useState<string | null>(null);

  const hodAnchors = useMemo((): HodAnchor[] => {
    const rows: HodAnchor[] = [];
    for (const dept of tree) {
      for (const sub of dept.subDepartments) {
        for (const root of sub.roots) {
          rows.push({
            departmentId: dept.id,
            departmentName: dept.name,
            departmentCode: dept.code,
            subDepartmentId: sub.id,
            subDepartmentName: sub.name,
            root,
          });
        }
      }
    }
    return rows;
  }, [tree]);

  useEffect(() => {
    if (hodAnchors.length === 0) {
      setSelectedHodId(null);
      setPath({ departmentId: null, subDepartmentId: null, employeeChain: [] });
      return;
    }
    const first = hodAnchors[0]!;
    setSelectedHodId(first.root.id);
    setPath({
      departmentId: first.departmentId,
      subDepartmentId: first.subDepartmentId,
      employeeChain: [first.root.id],
    });
  }, [hodAnchors]);

  const searchMatch = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;
    return findFirstSearchMatch(tree, query);
  }, [tree, search]);

  useEffect(() => {
    if (!searchMatch) {
      setScrollToNodeId(null);
      return;
    }
    const rootId = searchMatch.employeeChain[0] ?? null;
    setSelectedHodId(rootId);
    setPath({
      departmentId: searchMatch.departmentId,
      subDepartmentId: searchMatch.subDepartmentId,
      employeeChain: searchMatch.employeeChain,
    });
    const depth = searchMatch.employeeChain.length - 1;
    setScrollToNodeId(`emp-${searchMatch.employeeId}-${depth}`);
  }, [searchMatch]);

  const selectedDept = useMemo(
    () => tree.find((d) => d.id === path.departmentId) ?? null,
    [tree, path.departmentId],
  );

  const selectedSub = useMemo(
    () =>
      selectedDept?.subDepartments.find((s) => s.id === path.subDepartmentId) ??
      null,
    [selectedDept, path.subDepartmentId],
  );

  const highlightedEmployeeId = searchMatch?.employeeId ?? null;

  const selectedHodAnchors = useMemo(
    () =>
      selectedHodId == null
        ? []
        : hodAnchors.filter((a) => a.root.id === selectedHodId),
    [hodAnchors, selectedHodId],
  );

  const selectedHodAnchor = useMemo(() => {
    if (selectedHodAnchors.length === 0) return null;
    return (
      selectedHodAnchors.find(
        (a) =>
          a.departmentId === path.departmentId &&
          a.subDepartmentId === path.subDepartmentId,
      ) ?? selectedHodAnchors[0]
    );
  }, [selectedHodAnchors, path.departmentId, path.subDepartmentId]);

  const selectedHodNode = selectedHodAnchor?.root ?? null;

  const columns = useMemo((): HierarchyColumn[] => {
    const result: HierarchyColumn[] = [
      {
        id: "hod-name",
        title: "HOD name",
        nodes: hodAnchors.map((anchor) => ({
          id: `hod-${anchor.root.id}`,
          kind: "employee" as const,
          title: anchor.root.name,
          subtitle: "HOD name",
          count: anchor.root.directReports.length,
          selected: anchor.root.id === selectedHodId,
          highlighted: anchor.root.id === highlightedEmployeeId,
          empId: anchor.root.empId,
          profilePhotoUrl: anchor.root.profilePhotoUrl ?? null,
          employeeId: anchor.root.id,
          onClick: () =>
            setPath({
              departmentId: anchor.departmentId,
              subDepartmentId: anchor.subDepartmentId,
              employeeChain: [anchor.root.id],
            }),
        })).map((node) => ({
          ...node,
          onClick: () => {
            setSelectedHodId(node.employeeId ?? null);
            const anchor = hodAnchors.find((a) => a.root.id === node.employeeId);
            if (!anchor) return;
            setPath({
              departmentId: anchor.departmentId,
              subDepartmentId: anchor.subDepartmentId,
              employeeChain: [anchor.root.id],
            });
          },
        })),
      },
    ];

    if (selectedHodAnchors.length === 0) return result;

    const deptChoices = selectedHodAnchors.reduce<
      Array<{ id: number; name: string; code: string }>
    >((acc, item) => {
      if (!acc.some((d) => d.id === item.departmentId)) {
        acc.push({
          id: item.departmentId,
          name: item.departmentName,
          code: item.departmentCode,
        });
      }
      return acc;
    }, []);

    result.push({
      id: "departments",
      title: "Department",
      nodes: deptChoices.map((dept) => ({
        id: `dept-${dept.id}`,
        kind: "department" as const,
        title: dept.name,
        subtitle: dept.code,
        count:
          selectedHodAnchors.filter((a) => a.departmentId === dept.id).length,
        selected: dept.id === path.departmentId,
        onClick: () =>
          setPath((prev) => ({
            ...prev,
            departmentId: dept.id,
            subDepartmentId:
              selectedHodAnchors.find((a) => a.departmentId === dept.id)
                ?.subDepartmentId ?? null,
            employeeChain: prev.employeeChain.length > 0 ? [prev.employeeChain[0]!] : [],
          })),
      })),
      emptyMessage: "No departments for this HOD.",
    });

    const subChoices = selectedHodAnchors
      .filter((a) => a.departmentId === path.departmentId)
      .reduce<Array<{ id: number; name: string }>>((acc, item) => {
        if (!acc.some((s) => s.id === item.subDepartmentId)) {
          acc.push({ id: item.subDepartmentId, name: item.subDepartmentName });
        }
        return acc;
      }, []);

    result.push({
      id: "sub-departments",
      title: "Sub Department",
      nodes: subChoices.map((sub) => ({
        id: `sub-${sub.id}`,
        kind: "subDepartment" as const,
        title: sub.name,
        selected: sub.id === path.subDepartmentId,
        onClick: () =>
          setPath((prev) => ({
            ...prev,
            subDepartmentId: sub.id,
            employeeChain: prev.employeeChain.length > 0 ? [prev.employeeChain[0]!] : [],
          })),
      })),
      emptyMessage: "No sub departments for this HOD in the selected department.",
    });

    if (!selectedHodNode || path.subDepartmentId == null) return result;

    const chainTail = path.employeeChain.slice(1);
    const employeeColumns = buildEmployeeColumns(
      selectedHodNode.directReports,
      chainTail,
      highlightedEmployeeId,
      (employeeId, depth) => {
        setPath((prev) => {
          const nextTail = [...prev.employeeChain.slice(1, depth + 1), employeeId];
          return {
            ...prev,
            employeeChain:
              prev.employeeChain.length > 0
                ? [prev.employeeChain[0]!, ...nextTail]
                : nextTail,
          };
        });
      },
    );

    return [...result, ...employeeColumns];
  }, [
    hodAnchors,
    selectedHodAnchors,
    selectedHodId,
    path.subDepartmentId,
    path.departmentId,
    path.employeeChain,
    selectedHodNode,
    highlightedEmployeeId,
  ]);

  const totalEmployees = useMemo(
    () => tree.reduce((sum, dept) => sum + countDepartmentEmployees(dept), 0),
    [tree],
  );

  const searchHasNoMatch = search.trim().length > 0 && !searchMatch;

  if (tree.length === 0) {
    return (
      <div className={`${employeeCardClass} overflow-hidden`}>
        <p className={employeeListTableEmptyClass}>
          No active employees found. Assign department roles on employee profiles
          and set reporting managers to build the hierarchy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${employeeCardClass} p-4 md:p-5 space-y-4`}>
        <HierarchyGuide levels={levels} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-gray-900">
              {totalEmployees} active employee{totalEmployees === 1 ? "" : "s"}{" "}
              across {tree.length} department{tree.length === 1 ? "" : "s"}
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              HOD name, then Department, then Sub Department, then Assign Employee
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label className={employeeFilterLabelClass} htmlFor="hierarchy-search">
              Search employee
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
      </div>

      {searchHasNoMatch ? (
        <div className={`${employeeCardClass} overflow-hidden`}>
          <p className={employeeListTableEmptyClass}>
            No employees match &ldquo;{search.trim()}&rdquo;.
          </p>
        </div>
      ) : (
        <HierarchyColumnTree columns={columns} scrollToNodeId={scrollToNodeId} />
      )}
    </div>
  );
}

// Re-export for tests or external use
