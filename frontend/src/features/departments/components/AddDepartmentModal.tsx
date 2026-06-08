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
} from "@/features/employees/employee-theme";
import { createDepartment } from "../api/departments.client";
import DepartmentFormFields from "./DepartmentFormFields";
import {
  departmentFormSchema,
  emptyDepartmentFormValues,
  toCreateDepartmentPayload,
  type DepartmentFormValues,
} from "../schemas/department.schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees: EmployeeListItem[];
  branches: LookupItem[];
}

export default function AddDepartmentModal({
  open,
  onClose,
  onSaved,
  employees,
  branches,
}: Props) {
  const [values, setValues] = useState<DepartmentFormValues>(
    emptyDepartmentFormValues,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setValues(emptyDepartmentFormValues);
      setSubmitError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const parsed = departmentFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await createDepartment(
        toCreateDepartmentPayload(parsed.data, branches),
      );
      toast.success("Department created.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EmployeeModalShell open={open} onClose={onClose} title="Add Department">
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
            {submitting ? "Saving…" : "Save Department"}
          </button>
        </div>
      </form>
    </EmployeeModalShell>
  );
}
