"use client";

import { useEffect, useState } from "react";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnSmClass,
  employeeErrorBannerClass,
  employeeFieldLabelClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import {
  fetchDepartmentById,
  type DepartmentDetail,
} from "../api/departments.client";

interface Props {
  departmentId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
  managerNames: Map<number, string>;
}

export default function ViewDepartmentModal({
  departmentId,
  open,
  onClose,
  onEdit,
  managerNames,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [department, setDepartment] = useState<DepartmentDetail | null>(null);

  useEffect(() => {
    if (!open || departmentId == null) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const row = await fetchDepartmentById(departmentId);
        if (cancelled) return;
        setDepartment(row);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, departmentId]);

  const title = department?.name ?? "Department Details";
  const managerName =
    department?.managerId != null
      ? (managerNames.get(department.managerId) ?? "—")
      : "—";

  return (
    <EmployeeModalShell open={open} onClose={onClose} title={title}>
      {loading && (
        <div className={employeeLoadingClass}>Loading department…</div>
      )}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && department && (
        <div className="p-6 space-y-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 m-0">
            {[
              ["Name", department.name],
              ["Manager", managerName],
              ["Branch", department.locationArea ?? "—"],
              [
                "Headcount",
                department.headcount === 0 ? "—" : String(department.headcount),
              ],
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
              onClick={() => onEdit(department.id)}
              type="button"
            >
              Edit Department
            </button>
          </div>
        </div>
      )}
    </EmployeeModalShell>
  );
}
