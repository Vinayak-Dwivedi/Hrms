"use client";

import type {
  EmployeeListItem,
  LookupItem,
} from "@/features/employees/api/employees.client";
import { formatEmployeeDisplayName } from "@/features/employees/api/employees.client";
import type { DepartmentFormValues } from "../schemas/department.schema";
import {
  employeeFilterLabelClass,
  employeeInputClass,
  employeeSelectClass,
} from "@/features/employees/employee-theme";

interface Props {
  values: DepartmentFormValues;
  onChange: (values: DepartmentFormValues) => void;
  employees: EmployeeListItem[];
  branches: LookupItem[];
  disabled?: boolean;
}

export default function DepartmentFormFields({
  values,
  onChange,
  employees,
  branches,
  disabled,
}: Props) {
  function set<K extends keyof DepartmentFormValues>(
    key: K,
    value: DepartmentFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={employeeFilterLabelClass} htmlFor="dept-name">
          Name
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="dept-name"
          onChange={(e) => set("name", e.target.value)}
          placeholder="Operations"
          type="text"
          value={values.name}
        />
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="dept-manager">
          Manager
        </label>
        <select
          className={employeeSelectClass}
          disabled={disabled}
          id="dept-manager"
          onChange={(e) => set("managerId", e.target.value)}
          value={values.managerId}
        >
          <option value="">No manager</option>
          {employees.map((emp) => (
            <option key={emp.id} value={String(emp.id)}>
              {formatEmployeeDisplayName(emp)} ({emp.empId})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="dept-branch">
          Branch
        </label>
        <select
          className={employeeSelectClass}
          disabled={disabled}
          id="dept-branch"
          onChange={(e) => set("branchId", e.target.value)}
          value={values.branchId}
        >
          <option value="">No branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={String(branch.id)}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="dept-headcount">
          Headcount
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="dept-headcount"
          inputMode="numeric"
          onChange={(e) => set("headcount", e.target.value)}
          placeholder="Optional"
          type="text"
          value={values.headcount}
        />
      </div>
    </div>
  );
}
