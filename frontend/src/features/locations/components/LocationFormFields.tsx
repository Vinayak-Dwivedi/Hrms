"use client";

import type { LocationFormValues } from "../schemas/location.schema";
import {
  employeeFilterLabelClass,
  employeeInputClass,
} from "@/features/employees/employee-theme";

interface Props {
  values: LocationFormValues;
  onChange: (values: LocationFormValues) => void;
  disabled?: boolean;
}

export default function LocationFormFields({
  values,
  onChange,
  disabled,
}: Props) {
  function set<K extends keyof LocationFormValues>(
    key: K,
    value: LocationFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={employeeFilterLabelClass} htmlFor="loc-name">
          Name
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="loc-name"
          onChange={(e) => set("name", e.target.value)}
          placeholder="iLeads Dehradun HQ"
          type="text"
          value={values.name}
        />
      </div>
      <div>
        <label className={employeeFilterLabelClass} htmlFor="loc-headcount">
          Headcount
        </label>
        <input
          className={employeeInputClass}
          disabled={disabled}
          id="loc-headcount"
          inputMode="numeric"
          onChange={(e) => set("headcount", e.target.value)}
          placeholder="Optional"
          type="text"
          value={values.headcount}
        />
      </div>
      <div className="md:col-span-2">
        <label className={employeeFilterLabelClass} htmlFor="loc-address">
          Address
        </label>
        <textarea
          className={`${employeeInputClass} min-h-[80px] resize-y`}
          disabled={disabled}
          id="loc-address"
          onChange={(e) => set("address", e.target.value)}
          placeholder="Optional address"
          value={values.address ?? ""}
        />
      </div>
    </div>
  );
}
