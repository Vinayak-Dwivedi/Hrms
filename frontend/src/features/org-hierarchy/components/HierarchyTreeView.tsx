"use client";

import { useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import type { HierarchyTreeDepartment } from "@/features/org-hierarchy/api/org-hierarchy.client";
import {
  employeeBtnOutlineSmClass,
  employeeCardClass,
  employeeEditIconBtnClass,
  employeeIconSm,
  employeeIconXs,
  employeeListTableEmptyClass,
} from "@/features/employees/employee-theme";
import { cn } from "@/lib/utils";

type Props = {
  tree: HierarchyTreeDepartment[];
  onEditStructure: (structureId: number) => void;
  onDeleteStructure: (structureId: number) => void;
};

export default function HierarchyTreeView({
  tree,
  onEditStructure,
  onDeleteStructure,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<{
    structureId: number;
    designation: string;
  } | null>(null);
  if (tree.length === 0) {
    return (
      <div className={`${employeeCardClass} overflow-hidden`}>
        <p className={employeeListTableEmptyClass}>
          No hierarchy mappings yet. Open Structure Mapping to add departments,
          sub-departments, and designations.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className={`${employeeCardClass} p-5 md:p-6`}>
      <div className="space-y-1">
        {tree.map((dept) => (
          <Collapsible key={dept.id} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-[13px] font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
              <ChevronRight
                className={cn(
                  employeeIconXs,
                  "text-gray-400 transition-transform [[data-state=open]_&]:rotate-90",
                )}
              />
              <span>{dept.name}</span>
              <span className="text-[11px] font-normal uppercase tracking-wide text-gray-400">
                {dept.code}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-3 border-l border-gray-100 pl-4 space-y-1">
              {dept.subDepartments.map((sub) => (
                <Collapsible key={sub.id} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <ChevronRight
                      className={cn(
                        employeeIconXs,
                        "text-gray-400 transition-transform [[data-state=open]_&]:rotate-90",
                      )}
                    />
                    {sub.name}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-6 space-y-1 py-1">
                    {sub.roles.map((role) => (
                      <div
                        key={role.structureId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-[13px] text-gray-600"
                      >
                        <span>
                          <span className="font-medium text-gray-800">
                            {role.designation}
                          </span>{" "}
                          <span className="text-gray-500">({role.level})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={employeeEditIconBtnClass}
                            onClick={() => onEditStructure(role.structureId)}
                            aria-label="Edit mapping"
                            title="Edit"
                          >
                            <Pencil className={employeeIconSm} />
                          </button>
                          <button
                            type="button"
                            className={employeeEditIconBtnClass}
                            onClick={() =>
                              setConfirmDelete({
                                structureId: role.structureId,
                                designation: role.designation,
                              })
                            }
                            aria-label="Delete mapping"
                            title="Delete"
                          >
                            <Trash2 className={employeeIconSm} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {sub.roles.length === 0 && (
                      <p className="px-2 py-1 text-[12px] text-gray-400">
                        No roles mapped.
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {dept.subDepartments.length === 0 && (
                <p className="px-2 py-1 text-[12px] text-gray-400">
                  No sub-departments.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>

      <EmployeeModalShell
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete Confirmation"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete the mapping for{" "}
            <strong className="text-gray-900">{confirmDelete?.designation}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className={employeeBtnOutlineSmClass}
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors"
              onClick={() => {
                if (confirmDelete) {
                  onDeleteStructure(confirmDelete.structureId);
                  setConfirmDelete(null);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </EmployeeModalShell>
    </>
  );
}
