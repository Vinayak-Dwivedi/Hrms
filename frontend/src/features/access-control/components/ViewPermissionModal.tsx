"use client";

import { useEffect, useState } from "react";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnSmClass,
  employeeErrorBannerClass,
  employeeFieldLabelClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import { fetchPermissionById, type PermissionDetail } from "../api/permissions.client";

interface Props {
  permissionId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
}

export default function ViewPermissionModal({
  permissionId,
  open,
  onClose,
  onEdit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionDetail | null>(null);

  useEffect(() => {
    if (!open || permissionId == null) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const row = await fetchPermissionById(permissionId);
        if (cancelled) return;
        setPermission(row);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, permissionId]);

  const title = permission?.name ?? "Permission Details";

  return (
    <EmployeeModalShell open={open} onClose={onClose} title={title}>
      {loading && <div className={employeeLoadingClass}>Loading permission…</div>}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && permission && (
        <div className="p-6 space-y-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 m-0">
            {[
              ["Code", permission.code],
              ["Name", permission.name],
              ["Module", permission.module],
              ["Status", permission.isActive ? "Active" : "Inactive"],
              ["Description", permission.description ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className={employeeFieldLabelClass}>{label}</dt>
                <dd className="text-sm text-gray-800 mt-1 m-0">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end pt-2">
            <button
              className={employeeBtnSmClass}
              onClick={() => onEdit(permission.id)}
              type="button"
            >
              Edit Permission
            </button>
          </div>
        </div>
      )}
    </EmployeeModalShell>
  );
}
