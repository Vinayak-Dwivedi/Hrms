// Admin weekly-off CRUD client. Talks to /api/admin/weekly-off-configs with
// credentials: 'include' so the hrms_at cookie is sent.

import { API_BASE } from "@/lib/hrms-client";

export type WeeklyOffStatus = "Draft" | "Published" | "Archived";
export type WeeklyOffMode = "Fixed" | "Rotational" | "Roster";

export type DayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type ScopeType =
  | "Company"
  | "Branch"
  | "Location"
  | "Department"
  | "SubDepartment"
  | "Designation"
  | "Grade"
  | "EmploymentType"
  | "Employee";

export interface WeeklyOffScopeRow {
  id?: number;
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
}

/** A day that is off only on certain occurrences within the month — e.g.
 *  "2nd & 4th Saturday" is { day: "Saturday", weeks: [2, 4] }. `weeks` lists
 *  the nth occurrence (1–5) of that weekday in the month that is non-working. */
export interface AlternateDayRule {
  day: DayName;
  weeks: number[];
}

export interface FixedSettings {
  /** Off every week. */
  days: DayName[];
  /** Off only on specific week-of-month occurrences (e.g. alternate Saturdays). */
  alternateDays?: AlternateDayRule[];
}

export interface RotationalSettings {
  offsPerWeek: number;
  cycleWeeks: number;
  pattern?: DayName[][];
}

export interface RosterSettings {
  description: string;
}

export type WeeklyOffSettings =
  | FixedSettings
  | RotationalSettings
  | RosterSettings;

export interface WeeklyOffSummary {
  id: number;
  name: string;
  description: string | null;
  status: WeeklyOffStatus;
  mode: WeeklyOffMode;
  updatedAt: string;
}

export interface WeeklyOffDetail {
  id: number;
  name: string;
  description: string | null;
  status: WeeklyOffStatus;
  mode: WeeklyOffMode;
  settings: WeeklyOffSettings;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  scope: WeeklyOffScopeRow[];
}

export interface WeeklyOffUpsert {
  name: string;
  description: string | null;
  status: WeeklyOffStatus;
  mode: WeeklyOffMode;
  settings: WeeklyOffSettings;
  scope: WeeklyOffScopeRow[];
}

export class WeeklyOffApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "WeeklyOffApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/admin/weekly-off-configs${path}`;
}

async function parseErr(res: Response): Promise<WeeklyOffApiError> {
  const body = await res.json().catch(() => ({}));
  const err = (body as { error?: { code?: string; message?: string } }).error;
  return new WeeklyOffApiError(
    res.status,
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? `Request failed with status ${res.status}`,
  );
}

export async function listWeeklyOff(): Promise<WeeklyOffSummary[]> {
  const res = await fetch(buildUrl(""), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: WeeklyOffSummary[] };
  return body.data;
}

export async function getWeeklyOff(id: number): Promise<WeeklyOffDetail> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: WeeklyOffDetail };
  return body.data;
}

export async function createWeeklyOff(
  body: WeeklyOffUpsert,
): Promise<WeeklyOffDetail> {
  const res = await fetch(buildUrl(""), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: WeeklyOffDetail };
  return data.data;
}

export async function updateWeeklyOff(
  id: number,
  body: Partial<WeeklyOffUpsert>,
): Promise<WeeklyOffDetail> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: WeeklyOffDetail };
  return data.data;
}

export async function deleteWeeklyOff(id: number): Promise<void> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
}

// ── Roster planner ──

export interface RosterEmployee {
  id: number;
  empId: string;
  name: string;
}
export interface RosterData {
  from: string;
  to: string;
  employees: RosterEmployee[];
  /** employeeId → list of off-date strings (YYYY-MM-DD) */
  offDates: Record<number, string[]>;
}

export async function fetchRoster(configId: number, month: string): Promise<RosterData> {
  const res = await fetch(buildUrl(`/${configId}/roster?month=${month}`), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: RosterData };
  return body.data;
}

export async function saveRoster(
  configId: number,
  month: string,
  entries: { employeeId: number; date: string }[],
): Promise<number> {
  const res = await fetch(buildUrl(`/${configId}/roster`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month, entries }),
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: { saved: number } };
  return body.data.saved;
}

export function defaultSettingsForMode(
  mode: WeeklyOffMode,
): WeeklyOffSettings {
  switch (mode) {
    case "Fixed":
      return { days: ["Sunday"] };
    case "Rotational":
      return { offsPerWeek: 1, cycleWeeks: 4 };
    case "Roster":
      return { description: "" };
  }
}
