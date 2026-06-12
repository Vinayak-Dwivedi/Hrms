"use client";

import {
  employeeListPaginationBtnActiveClass,
  employeeListPaginationBtnInactiveClass,
} from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";

export type HierarchyTabId = "tree" | "masters" | "mapping";

const TABS: { id: HierarchyTabId; label: string }[] = [
  { id: "tree", label: "Tree View" },
  { id: "masters", label: "Masters" },
  { id: "mapping", label: "Structure Mapping" },
];

type Props = {
  active: HierarchyTabId;
  onChange: (tab: HierarchyTabId) => void;
  className?: string;
};

export default function HierarchyTabBar({ active, onChange, className }: Props) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={
            active === tab.id
              ? employeeListPaginationBtnActiveClass
              : employeeListPaginationBtnInactiveClass
          }
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export type MasterTabId =
  | "departments"
  | "sub-departments"
  | "designations"
  | "levels";

const MASTER_TABS: { id: MasterTabId; label: string }[] = [
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
    <div className={cn("flex flex-wrap gap-2", className)}>
      {MASTER_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={
            active === tab.id
              ? employeeListPaginationBtnActiveClass
              : employeeListPaginationBtnInactiveClass
          }
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
