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
  fetchPermissions,
  type PermissionListItem,
} from "../api/permissions.client";
import {
  fetchRoleById,
  fetchRolePermissionIds,
  setRolePermissions,
  updateRole,
  type RoleDetail,
} from "../api/roles.client";
import PermissionMatrix from "./PermissionMatrix";
import RoleFormFields from "./RoleFormFields";
import {
  detailToRoleFormValues,
  roleFormSchema,
  toUpdateRolePayload,
  type RoleFormValues,
} from "../schemas/role.schema";

interface Props {
  roleId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditRoleModal({
  roleId,
  open,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [values, setValues] = useState<RoleFormValues | null>(null);
  const [permissions, setPermissions] = useState<PermissionListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        setValues({ ...detailToRoleFormValues(row), permissionIds: permIds });
        setPermissions(perms);
        setSelectedIds(permIds);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (roleId == null || !values) return;
    setSubmitError(null);
    const parsed = roleFormSchema.safeParse({ ...values, permissionIds: selectedIds });
    if (!parsed.success) {
      setSubmitError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSubmitting(true);
    try {
      await updateRole(roleId, toUpdateRolePayload(parsed.data));
      await setRolePermissions(roleId, selectedIds);
      toast.success("Role updated.");
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const title = role != null ? `Edit — ${role.name}` : "Edit Role";

  return (
    <EmployeeModalShell
      maxWidthClass="max-w-4xl"
      open={open}
      onClose={onClose}
      title={title}
    >
      {loading && <div className={employeeLoadingClass}>Loading role…</div>}
      {loadError && (
        <div className={`m-6 ${employeeErrorBannerClass}`}>{loadError}</div>
      )}
      {!loading && !loadError && values && (
        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
          {submitError && (
            <div className={employeeErrorBannerClass}>{submitError}</div>
          )}
          <RoleFormFields onChange={setValues} values={values} />
          <PermissionMatrix
            onChange={setSelectedIds}
            permissions={permissions}
            selectedIds={selectedIds}
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
