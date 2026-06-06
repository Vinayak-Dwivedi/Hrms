"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import EmployeeModalShell from "@/features/employees/components/EmployeeModalShell";
import {
  employeeBtnClass,
  employeeBtnOutlineSmClass,
  employeeErrorBannerClass,
  employeeLoadingClass,
} from "@/features/employees/employee-theme";
import {
  fetchPermissionById,
  updatePermission,
  type PermissionDetail,
} from "../api/permissions.client";
import PermissionFormFields from "./PermissionFormFields";
import {
  detailToPermissionFormValues,
  permissionFormSchema,
  toUpdatePermissionPayload,
  type PermissionFormValues,
} from "../schemas/permission.schema";

interface Props {
  permissionId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditPermissionModal({
  permissionId,
  open,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionDetail | null>(null);
  const [values, setValues] = useState<PermissionFormValues | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setValues(detailToPermissionFormValues(row));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (permissionId == null || !values) return;
    setSubmitError(null);
    const parsed = permissionFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await updatePermission(permissionId, toUpdatePermissionPayload(parsed.data));
      toast.success("Permission updated.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    permission != null ? `Edit — ${permission.name}` : "Edit Permission";

  return (
    <EmployeeModalShell open={open} onClose={onClose} title={title}>
      {loading && <div className={employeeLoadingClass}>Loading permission…</div>}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && values && (
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
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </EmployeeModalShell>
  );
}
