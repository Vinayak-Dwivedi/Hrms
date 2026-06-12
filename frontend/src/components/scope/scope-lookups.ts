// Lookup helpers for the reusable ScopeRowsEditor. Each scope type maps to
// an HRMS CRUD endpoint that returns `{ data: Row[] }`. Items are normalised
// to `{ id, name }` because most consumers (holiday calendars, weekly off,
// leave policies) only need the human label.

import { API_BASE } from "@/lib/hrms-client";

export type ScopeType =
  | "Company"
  | "Branch"
  | "Location"
  | "Department"
  | "SubDepartment"
  | "Designation"
  | "Grade"
  | "EmploymentType"
  | "Employee"
  | "Process";

export interface ScopeOptionItem {
  id: number;
  name: string;
}

type RawRow = Record<string, unknown>;

async function fetchHrmsList(path: string): Promise<RawRow[]> {
  const res = await fetch(`${API_BASE}/api/hrms/${path}?limit=500`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  const body = (await res.json()) as { data: RawRow[] };
  return body.data ?? [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function rowsAsOptions(rows: RawRow[], nameOf: (r: RawRow) => string): ScopeOptionItem[] {
  return rows
    .map((r) => {
      const id = num(r.id);
      if (id == null) return null;
      const name = nameOf(r).trim();
      return { id, name: name || `#${id}` };
    })
    .filter((x): x is ScopeOptionItem => x !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchScopeOptions(
  scopeType: ScopeType,
): Promise<ScopeOptionItem[]> {
  switch (scopeType) {
    case "Company":
    case "Process":
      // Company applies to everyone; Process has no canonical table yet.
      return [];
    case "Branch":
      return rowsAsOptions(await fetchHrmsList("branches"), (r) => str(r.name));
    case "Location":
      return rowsAsOptions(await fetchHrmsList("locations"), (r) => str(r.name));
    case "Department":
      return rowsAsOptions(
        await fetchHrmsList("departments"),
        (r) => str(r.name),
      );
    case "SubDepartment":
      return rowsAsOptions(
        await fetchHrmsList("sub-departments"),
        (r) => str(r.name),
      );
    case "Designation":
      return rowsAsOptions(
        await fetchHrmsList("designations"),
        (r) => str(r.name),
      );
    case "Grade":
      return rowsAsOptions(
        await fetchHrmsList("grades"),
        (r) => `${str(r.code)} — ${str(r.band_name)}`.replace(/^ — $/, ""),
      );
    case "EmploymentType":
      return rowsAsOptions(
        await fetchHrmsList("employment-types"),
        (r) => str(r.name),
      );
    case "Employee":
      return rowsAsOptions(await fetchHrmsList("employees"), (r) => {
        const first = str(r.first_name);
        const last = str(r.last_name);
        const full = `${first} ${last}`.trim();
        return full || str(r.work_email) || str(r.personal_email);
      });
  }
}

// Friendly label for UI: rendered in the scope-row preview tag.
export function scopeTypeLabel(scopeType: ScopeType): string {
  switch (scopeType) {
    case "EmploymentType":
      return "Employment Type";
    case "SubDepartment":
      return "Sub-Department";
    default:
      return scopeType;
  }
}
