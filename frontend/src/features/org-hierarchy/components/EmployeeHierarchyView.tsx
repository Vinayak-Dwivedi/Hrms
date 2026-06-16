"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Info,
  Search,
  Users,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  EmployeeReportingNode,
  EmployeeReportingTreeDepartment,
  OrgLevel,
} from "@/features/org-hierarchy/api/org-hierarchy.client";
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

function countSubtree(node: EmployeeReportingNode): number {
  return (
    1 +
    node.directReports.reduce((sum, child) => sum + countSubtree(child), 0)
  );
}

function countGroupEmployees(roots: EmployeeReportingNode[]): number {
  return roots.reduce((sum, root) => sum + countSubtree(root), 0);
}

function formatLevelLabel(node: EmployeeReportingNode): string {
  if (node.levelName && node.levelCode) {
    return `${node.levelName} (${node.levelCode})`;
  }
  if (node.levelName) return node.levelName;
  if (node.levelCode) return node.levelCode;
  return "Level not set";
}

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

function nodeMatchesSearch(node: EmployeeReportingNode, query: string): boolean {
  const haystack = [node.name, node.empId, node.designation ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function filterNodes(
  nodes: EmployeeReportingNode[],
  query: string,
): EmployeeReportingNode[] {
  if (!query) return nodes;

  const filtered: EmployeeReportingNode[] = [];
  for (const node of nodes) {
    const childMatches = filterNodes(node.directReports, query);
    if (nodeMatchesSearch(node, query) || childMatches.length > 0) {
      filtered.push({ ...node, directReports: childMatches });
    }
  }
  return filtered;
}

function LevelBadge({ node }: { node: EmployeeReportingNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        levelTierClass(node.levelSortOrder),
      )}
      title={
        node.levelSortOrder != null
          ? `Position rank ${node.levelSortOrder} — lower number means higher seniority`
          : "No org level assigned on employee profile"
      }
    >
      {formatLevelLabel(node)}
    </span>
  );
}

function EmployeeRow({
  node,
  depth,
  isLast,
}: {
  node: EmployeeReportingNode;
  depth: number;
  isLast: boolean;
}) {
  const teamSize = countSubtree(node);
  const directCount = node.directReports.length;
  const hasReports = directCount > 0;

  return (
    <div className="relative">
      {depth > 0 && (
        <span
          aria-hidden
          className={cn(
            "absolute -left-4 top-0 bottom-0 w-px bg-gray-200",
            isLast ? "h-5" : "",
          )}
        />
      )}
      {depth > 0 && (
        <span
          aria-hidden
          className="absolute -left-4 top-5 h-px w-4 bg-gray-200"
        />
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5 sm:grid-cols-[minmax(140px,1fr)_minmax(180px,1.4fr)_minmax(120px,1fr)_auto]",
          depth > 0 && "ml-6",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <LevelBadge node={node} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/employees/${node.id}`}
              className="text-[13px] font-semibold text-gray-900 hover:text-blue-600 hover:underline truncate"
            >
              {node.name}
            </Link>
            <span className="text-[11px] text-gray-400 shrink-0">{node.empId}</span>
          </div>
          {depth === 0 ? (
            <p className="text-[11px] text-gray-500 mt-0.5">Team lead / senior role</p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Reporting level {depth + 1}
            </p>
          )}
        </div>

        <div className="text-[12px] text-gray-600 self-center truncate">
          {node.designation ?? "—"}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 self-center sm:justify-end">
          <Users className={cn(employeeIconXs, "shrink-0")} />
          {hasReports ? (
            <span>
              {directCount} direct · {teamSize} total
            </span>
          ) : (
            <span>Individual contributor</span>
          )}
        </div>
      </div>

      {hasReports && (
        <div className="mt-1 space-y-1 border-l border-dashed border-gray-200 ml-3 pl-3">
          {node.directReports.map((report, index) => (
            <EmployeeRow
              key={report.id}
              node={report}
              depth={depth + 1}
              isLast={index === node.directReports.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubDepartmentSection({
  name,
  roots,
  defaultOpen = true,
}: {
  name: string;
  roots: EmployeeReportingNode[];
  defaultOpen?: boolean;
}) {
  const headcount = countGroupEmployees(roots);

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            className={cn(
              employeeIconXs,
              "text-gray-400 shrink-0 transition-transform [[data-state=open]_&]:rotate-90",
            )}
          />
          <span className="text-[13px] font-medium text-gray-800 truncate">
            {name}
          </span>
        </div>
        <span className="text-[11px] text-gray-500 shrink-0">
          {headcount} employee{headcount === 1 ? "" : "s"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pb-1">
        <div className="hidden sm:grid grid-cols-[minmax(140px,1fr)_minmax(180px,1.4fr)_minmax(120px,1fr)_auto] gap-2 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          <span>Position level</span>
          <span>Employee</span>
          <span>Designation</span>
          <span className="text-right">Team</span>
        </div>

        {roots.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-gray-400">
            No employees in this sub-department.
          </p>
        ) : (
          <div className="space-y-2">
            {roots.map((root, index) => (
              <EmployeeRow
                key={root.id}
                node={root}
                depth={0}
                isLast={index === roots.length - 1}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
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
              Employees are grouped by <strong>Department</strong> then{" "}
              <strong>Sub-department</strong> from their profile.
            </li>
            <li>
              Within each team, people are listed <strong>top to bottom</strong>:
              senior roles first, then their direct reports indented below.
            </li>
            <li>
              <strong>Position level</strong> comes from the employee&apos;s
              designation grade (lower rank number = more senior).
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

export default function EmployeeHierarchyView({ tree, levels = [] }: Props) {
  const [search, setSearch] = useState("");

  const filteredTree = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tree;

    return tree
      .map((dept) => ({
        ...dept,
        subDepartments: dept.subDepartments
          .map((sub) => ({
            ...sub,
            roots: filterNodes(sub.roots, query),
          }))
          .filter((sub) => sub.roots.length > 0),
      }))
      .filter((dept) => dept.subDepartments.length > 0);
  }, [tree, search]);

  const totalEmployees = useMemo(
    () =>
      tree.reduce(
        (sum, dept) =>
          sum +
          dept.subDepartments.reduce(
            (subSum, sub) => subSum + countGroupEmployees(sub.roots),
            0,
          ),
        0,
      ),
    [tree],
  );

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
              Sorted by position level, then reporting manager chain
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

      {filteredTree.length === 0 ? (
        <div className={`${employeeCardClass} overflow-hidden`}>
          <p className={employeeListTableEmptyClass}>
            No employees match &ldquo;{search.trim()}&rdquo;.
          </p>
        </div>
      ) : (
        filteredTree.map((dept) => {
          const deptHeadcount = dept.subDepartments.reduce(
            (sum, sub) => sum + countGroupEmployees(sub.roots),
            0,
          );

          return (
            <div key={dept.id} className={`${employeeCardClass} overflow-hidden`}>
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ChevronDown
                      className={cn(
                        employeeIconXs,
                        "text-gray-400 shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90",
                      )}
                    />
                    <Building2 className={cn(employeeIconXs, "text-gray-500 shrink-0")} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900 truncate">
                        {dept.name}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        {dept.code}
                      </p>
                    </div>
                  </div>
                  <span className="text-[12px] text-gray-500 shrink-0">
                    {deptHeadcount} employee{deptHeadcount === 1 ? "" : "s"} ·{" "}
                    {dept.subDepartments.length} sub-dept
                    {dept.subDepartments.length === 1 ? "" : "s"}
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent className="p-4 space-y-4">
                  {dept.subDepartments.map((sub) => (
                    <SubDepartmentSection
                      key={sub.id}
                      name={sub.name}
                      roots={sub.roots}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })
      )}
    </div>
  );
}
