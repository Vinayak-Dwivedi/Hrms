"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  EmployeeListItem,
  LookupItem,
} from "@/features/employees/api/employees.client";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import {
  fetchDepartmentById,
  updateDepartment,
  type DepartmentDetail,
} from "../api/departments.client";
import DepartmentFormFields from "./DepartmentFormFields";
import {
  departmentFormSchema,
  detailToDepartmentFormValues,
  toUpdateDepartmentPayload,
  type DepartmentFormValues,
} from "../schemas/department.schema";

interface Props {
  departmentId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees: EmployeeListItem[];
  branches: LookupItem[];
}

export default function EditDepartmentModal({
  departmentId,
  open,
  onClose,
  onSaved,
  employees,
  branches,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [department, setDepartment] = useState<DepartmentDetail | null>(null);
  const [values, setValues] = useState<DepartmentFormValues | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setValues(detailToDepartmentFormValues(row, branches));
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, departmentId, branches]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (departmentId == null || !values) return;
    setSubmitError(null);
    const parsed = departmentFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await updateDepartment(
        departmentId,
        toUpdateDepartmentPayload(parsed.data, branches),
      );
      toast.success("Department updated.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    department != null ? `Edit — ${department.name}` : "Edit Department";

  return (
    <EmployeeModalShell open={open} onClose={onClose} title={title}>
      {loading && (
        <div className={employeeLoadingClass}>Loading department…</div>
      )}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && values && (
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {submitError && (
            <div className={employeeErrorBannerClass}>{submitError}</div>
          )}
          <DepartmentFormFields
            branches={branches}
            employees={employees}
            onChange={setValues}
            values={values}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              className={employeeBtnOutlineSmClass}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button className={employeeBtnClass} disabled={submitting} type="submit">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </EmployeeModalShell>
  );
}
