"use client";

import type { PermissionFormValues } from "../schemas/permission.schema";
import { PERMISSION_MODULES } from "../api/permissions.client";
import {
  employeeFieldLabelClass,
  employeeFilterLabelClass,
  employeeInputClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";

interface Props {
  values: PermissionFormValues;
  onChange: (values: PermissionFormValues) => void;
  disabled?: boolean;
}

export default function PermissionFormFields({ values, onChange, disabled }: Props) {
  function set<K extends keyof PermissionFormValues>(
    key: K,
    value: PermissionFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={employeeFilterLabelClass} htmlFor="perm-code">
          Code
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="perm-code"
          onChange={(e) => set("code", e.target.value)}
          placeholder="employees.view"
          type="text"
          value={values.code}
        />
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="perm-name">
          Name
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="perm-name"
          onChange={(e) => set("name", e.target.value)}
          placeholder="View Employees"
          type="text"
          value={values.name}
        />
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="perm-module">
          Module
        </label>
        <select
          className={employeeSelectClass}
          disabled={disabled}
          id="perm-module"
          onChange={(e) =>
            set("module", e.target.value as PermissionFormValues["module"])
          }
          value={values.module}
        >
          {PERMISSION_MODULES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="perm-status">
          Status
        </label>
        <select
          className={employeeSelectClass}
          disabled={disabled}
          id="perm-status"
          onChange={(e) => set("isActive", e.target.value === "active")}
          value={values.isActive ? "active" : "inactive"}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className={employeeFilterLabelClass} htmlFor="perm-desc">
          Description
        </label>
        <textarea
          className={`${employeeInputClass} min-h-[80px] resize-y`}
          disabled={disabled}
          id="perm-desc"
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional description"
          value={values.description ?? ""}
        />
      </div>
      <div className="md:col-span-2">
        <span className={employeeFieldLabelClass}>Active permissions can be assigned to roles.</span>
      </div>
    </div>
  );
}
