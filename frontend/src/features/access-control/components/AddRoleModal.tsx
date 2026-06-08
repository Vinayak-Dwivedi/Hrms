"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
} from "@/features/employees/employee-theme";
import { createRole } from "../api/roles.client";
import RoleFormFields from "./RoleFormFields";
import {
  emptyRoleFormValues,
  roleFormSchema,
  toCreateRolePayload,
  type RoleFormValues,
} from "../schemas/role.schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddRoleModal({ open, onClose, onSaved }: Props) {
  const [values, setValues] = useState<RoleFormValues>(emptyRoleFormValues);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setValues(emptyRoleFormValues);
      setSubmitError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const parsed = roleFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await createRole(toCreateRolePayload(parsed.data));
      toast.success("Role created.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <EmployeeModalShell open={open} onClose={onClose} title="Add Role">
      <form className="p-6 space-y-4" onSubmit={handleSubmit}>
        {submitError && (
          <div className={employeeErrorBannerClass}>{submitError}</div>
        )}
        <RoleFormFields onChange={setValues} values={values} />
        <div className="flex justify-end gap-3 pt-2">
          <button
            className={employeeBtnOutlineSmClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button className={employeeBtnClass} disabled={submitting} type="submit">
            {submitting ? "Saving…" : "Save Role"}
          </button>
        </div>
      </form>
    </EmployeeModalShell>
  );
}
