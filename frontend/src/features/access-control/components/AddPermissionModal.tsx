"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
} from "@/features/employees/employee-theme";
import { createPermission } from "../api/permissions.client";
import PermissionFormFields from "./PermissionFormFields";
import {
  emptyPermissionFormValues,
  permissionFormSchema,
  toCreatePermissionPayload,
  type PermissionFormValues,
} from "../schemas/permission.schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddPermissionModal({ open, onClose, onSaved }: Props) {
  const [values, setValues] = useState<PermissionFormValues>(emptyPermissionFormValues);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setValues(emptyPermissionFormValues);
      setSubmitError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const parsed = permissionFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await createPermission(toCreatePermissionPayload(parsed.data));
      toast.success("Permission created.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EmployeeModalShell open={open} onClose={onClose} title="Add Permission">
      <form className="p-6 space-y-4" onSubmit={handleSubmit}>
        {submitError && (
          <div className={employeeErrorBannerClass}>{submitError}</div>
        )}
        <PermissionFormFields onChange={setValues} values={values} />
        <div className="flex justify-end gap-3 pt-2">
          <button
            className={employeeBtnOutlineSmClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button className={employeeBtnClass} disabled={submitting} type="submit">
            {submitting ? "Saving…" : "Save Permission"}
          </button>
        </div>
      </form>
    </EmployeeModalShell>
  );
}
