// Returns the set of values that are valid for a Criteria row's "Value"
// dropdown, given the selected field. Each field maps to a different
// already-existing REST endpoint:
//   Leave Type       → /api/admin/leave-types (admin CRUD)
//   Department       → /api/hrms/departments  (createCrudRouter)
//   Designation      → /api/hrms/designations (createCrudRouter)
//   Employment Type  → /api/hrms/employment-types (createCrudRouter)
//
// "Number of Days" is the only non-lookup field — the caller renders a number
// input instead of asking us for options.

import { API_BASE } from "@/lib/hrms-client";
import { listLeaveTypes } from "./leave-types.client";

export interface LookupOption {
  value: string;
  label: string;
}

type CrudListResponse = { data: Array<{ id: number; name: string }> };

async function fetchHrmsLookup(path: string): Promise<LookupOption[]> {
  const res = await fetch(`${API_BASE}/api/hrms/${path}?limit=500`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  }
  const body = (await res.json()) as CrudListResponse;
  return body.data.map((row) => ({ value: row.name, label: row.name }));
}

export async function fetchLookupOptions(field: string): Promise<LookupOption[]> {
  switch (field) {
    case "Leave Type": {
      const types = await listLeaveTypes();
      return types
        .filter((t) => t.isActive)
        .map((t) => ({ value: t.name, label: `${t.name} (${t.code})` }));
    }
    case "Department":
      return fetchHrmsLookup("departments");
    case "Designation":
      return fetchHrmsLookup("designations");
    case "Employment Type":
      return fetchHrmsLookup("employment-types");
    default:
      return [];
  }
}

// Fields where the value picker must be a free-form number input.
export const NUMERIC_FIELDS = new Set<string>(["Number of Days"]);
