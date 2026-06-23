"use client";

import { cn } from "@/lib/utils";

export type HierarchyTabId = "employees" | "tree" | "masters" | "mapping";

export type DepartmentHierarchyTabId = "tree" | "masters" | "mapping";

const DEPARTMENT_TABS: { id: DepartmentHierarchyTabId; label: string }[] = [
  { id: "masters", label: "Masters" },
  { id: "mapping", label: "Structure Mapping" },
  { id: "tree", label: "Tree View" },
];

const TAB_ACTIVE =
  "px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-gradient-to-r from-[lab(36.9089%_35.0961_-85.6872)] to-[lab(30%_38_-90)] text-white";
const TAB_INACTIVE =
  "px-4 py-2 rounded-xl text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50";

type DepartmentTabBarProps = {
  active: DepartmentHierarchyTabId;
  onChange: (tab: DepartmentHierarchyTabId) => void;
  className?: string;
};

export function DepartmentHierarchyTabBar({
  active,
  onChange,
  className,
}: DepartmentTabBarProps) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-2xl px-2 py-2 inline-flex flex-wrap self-start gap-1",
        className,
      )}
    >
      {DEPARTMENT_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

type Props = {
  active: HierarchyTabId;
  onChange: (tab: HierarchyTabId) => void;
  className?: string;
};

/** @deprecated Use DepartmentHierarchyTabBar for department admin pages. */
export default function HierarchyTabBar({ active, onChange, className }: Props) {
  const tabs: { id: HierarchyTabId; label: string }[] = [
    { id: "employees", label: "Employee Hierarchy" },
    ...DEPARTMENT_TABS,
  ];

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-2xl px-2 py-2 inline-flex flex-wrap self-start gap-1",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export type MasterTabId =
  | "locations"
  | "departments"
  | "sub-departments"
  | "designations"
  | "levels";

const MASTER_TABS: { id: MasterTabId; label: string }[] = [
  { id: "locations", label: "Locations" },
  { id: "departments", label: "Departments" },
  { id: "sub-departments", label: "Sub Departments" },
  { id: "designations", label: "Designations" },
  { id: "levels", label: "Levels / Grades" },
];

type MasterProps = {
  active: MasterTabId;
  onChange: (tab: MasterTabId) => void;
  className?: string;
};

export function MasterTabBar({ active, onChange, className }: MasterProps) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1", className)}>
      {MASTER_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
