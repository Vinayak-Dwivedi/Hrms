"use client";

import { useEffect, useMemo, useState } from "react";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnSmClass,
  employeeErrorBannerClass,
  employeeFieldLabelClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import {
  fetchPermissions,
  type PermissionListItem,
} from "../api/permissions.client";
import {
  fetchRoleById,
  fetchRolePermissionIds,
  type RoleDetail,
} from "../api/roles.client";

interface Props {
  roleId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
}

export default function ViewRoleModal({
  roleId,
  open,
  onClose,
  onEdit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [permissions, setPermissions] = useState<PermissionListItem[]>([]);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open || roleId == null) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [row, perms, permIds] = await Promise.all([
          fetchRoleById(roleId),
          fetchPermissions(),
          fetchRolePermissionIds(roleId),
        ]);
        if (cancelled) return;
        setRole(row);
        setPermissions(perms);
        setAssignedIds(permIds);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, roleId]);

  const groupedAssigned = useMemo(() => {
    const permMap = new Map(permissions.map((p) => [p.id, p]));
    const map = new Map<string, PermissionListItem[]>();
    for (const id of assignedIds) {
      const p = permMap.get(id);
      if (!p) continue;
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [assignedIds, permissions]);

  const title = role?.name ?? "Role Details";

  return (
    <EmployeeModalShell
      maxWidthClass="max-w-3xl"
      open={open}
      onClose={onClose}
      title={title}
    >
      {loading && <div className={employeeLoadingClass}>Loading role…</div>}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && role && (
        <div className="p-6 space-y-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 m-0">
            {[
              ["Code", role.code],
              ["Name", role.name],
              ["Status", role.isActive ? "Active" : "Inactive"],
              ["Description", role.description ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className={employeeFieldLabelClass}>{label}</dt>
                <dd className="text-sm text-gray-800 mt-1 m-0">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h4 className={`${employeeFieldLabelClass} mb-3`}>
              Assigned Permissions ({assignedIds.length})
            </h4>
            {groupedAssigned.length === 0 ? (
              <p className="text-sm text-gray-500 m-0">No permissions assigned.</p>
            ) : (
              <div className="space-y-3">
                {groupedAssigned.map(([module, modulePerms]) => (
                  <div key={module}>
                    <p className="text-xs font-semibold uppercase text-gray-500 mb-1 capitalize">
                      {module}
                    </p>
                    <ul className="m-0 pl-4 text-sm text-gray-700 space-y-1">
                      {modulePerms.map((p) => (
                        <li key={p.id}>
                          {p.name}{" "}
                          <span className="text-xs text-gray-400 font-mono">
                            ({p.code})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              className={employeeBtnSmClass}
              onClick={() => onEdit(role.id)}
              type="button"
            >
              Edit Role
            </button>
          </div>
        </div>
      )}
    </EmployeeModalShell>
  );
}
