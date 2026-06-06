"use client";

import { useEffect, useState } from "react";
import EditEmployeeForm from "./EditEmployeeForm";
import EmployeeModalShell from "./EmployeeModalShell";
import {
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "../employee-theme";
import {
  fetchEmployeeById,
  formatEmployeeDisplayName,
  type EmployeeDetail,
} from "../api/employees.client";

interface Props {
  employeeId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditEmployeeModal({
  employeeId,
  open,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);

  useEffect(() => {
    if (!open || employeeId == null) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const emp = await fetchEmployeeById(employeeId);
        if (cancelled) return;
        setEmployee(emp);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, employeeId]);

  const title =
    employee != null
      ? `Edit — ${formatEmployeeDisplayName(employee)}`
      : "Edit Employee";

  return (
    <EmployeeModalShell maxWidthClass="max-w-4xl" open={open} onClose={onClose} title={title}>
      {loading && <div className={employeeLoadingClass}>Loading employee…</div>}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && employee && (
        <EditEmployeeForm
          employee={employee}
          embedded
          onCancel={onClose}
          onSuccess={() => {
            onSaved();
            onClose();
          }}
        />
      )}
    </EmployeeModalShell>
  );
}
