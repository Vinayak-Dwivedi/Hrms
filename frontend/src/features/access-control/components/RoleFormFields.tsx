"use client";

import type { RoleFormValues } from "../schemas/role.schema";
import {
  employeeFilterLabelClass,
  employeeInputClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";

interface Props {
  values: RoleFormValues;
  onChange: (values: RoleFormValues) => void;
  disabled?: boolean;
}

export default function RoleFormFields({ values, onChange, disabled }: Props) {
  function set<K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={employeeFilterLabelClass} htmlFor="role-code">
          Code
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="role-code"
          onChange={(e) => set("code", e.target.value)}
          placeholder="hr_admin"
          type="text"
          value={values.code}
        />
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="role-name">
          Name
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="role-name"
          onChange={(e) => set("name", e.target.value)}
          placeholder="HR Administrator"
          type="text"
          value={values.name}
        />
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="role-status">
          Status
        </label>
        <select
          className={employeeSelectClass}
          disabled={disabled}
          id="role-status"
          onChange={(e) => set("isActive", e.target.value === "active")}
          value={values.isActive ? "active" : "inactive"}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className={employeeFilterLabelClass} htmlFor="role-desc">
          Description
        </label>
        <textarea
          className={`${employeeInputClass} min-h-[80px] resize-y`}
          disabled={disabled}
          id="role-desc"
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional description"
          value={values.description ?? ""}
        />
      </div>
    </div>
  );
}
