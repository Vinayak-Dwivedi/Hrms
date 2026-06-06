"use client";

import { useMemo } from "react";
import type { PermissionListItem } from "../api/permissions.client";
import { employeeFilterLabelClass } from "@/features/employees/employee-theme";

interface Props {
  permissions: PermissionListItem[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export default function PermissionMatrix({
  permissions,
  selectedIds,
  onChange,
  disabled,
}: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, PermissionListItem[]>();
    for (const p of permissions.filter((x) => x.isActive)) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  function toggle(id: number) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function toggleModule(modulePerms: PermissionListItem[], selectAll: boolean) {
    if (disabled) return;
    const ids = modulePerms.map((p) => p.id);
    if (selectAll) {
      onChange([...new Set([...selectedIds, ...ids])]);
    } else {
      onChange(selectedIds.filter((id) => !ids.includes(id)));
    }
  }

  if (grouped.length === 0) {
    return (
      <p className="text-sm text-gray-500 m-0">No active permissions available.</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className={`${employeeFilterLabelClass} mb-0`}>Assigned Permissions</p>
      {grouped.map(([module, modulePerms]) => {
        const allSelected = modulePerms.every((p) => selectedIds.includes(p.id));
        const someSelected = modulePerms.some((p) => selectedIds.includes(p.id));
        return (
          <div
            key={module}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {module}
              </span>
              <button
                className="text-xs text-[#FF014F] hover:text-[#eb0249] bg-transparent border-0 cursor-pointer p-0"
                disabled={disabled}
                onClick={() => toggleModule(modulePerms, !allSelected)}
                type="button"
              >
                {allSelected ? "Deselect all" : someSelected ? "Select all" : "Select all"}
              </button>
            </div>
            <ul className="divide-y divide-gray-100 m-0 p-0 list-none">
              {modulePerms.map((perm) => (
                <li key={perm.id} className="px-4 py-2.5">
                  <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-700">
                    <input
                      checked={selectedIds.includes(perm.id)}
                      className="mt-0.5 accent-[#FF014F]"
                      disabled={disabled}
                      onChange={() => toggle(perm.id)}
                      type="checkbox"
                    />
                    <span>
                      <span className="font-medium block">{perm.name}</span>
                      <span className="text-xs text-gray-400 font-mono">{perm.code}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
