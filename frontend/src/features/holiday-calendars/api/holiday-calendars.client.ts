// Admin holiday-calendar CRUD client. Talks to /api/admin/holiday-calendars
// with credentials: 'include' so the hrms_at cookie is sent.

import { API_BASE } from "@/lib/hrms-client";

export type HolidayType =
  | "National"
  | "Regional"
  | "Optional"
  | "Restricted"
  | "Festival";

export type HolidayCalendarStatus = "Draft" | "Published" | "Archived";

export type ScopeType =
  | "Company"
  | "Branch"
  | "Location"
  | "Department"
  | "Designation"
  | "Grade"
  | "EmploymentType"
  | "Employee";

export interface PerHolidayScopeRow {
  scopeType: ScopeType;
  scopeId: number | null;
}

export interface HolidayRow {
  id?: number;
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
  isHalfDay: boolean;
  description: string | null;
  // Per-holiday scope override. Empty array → applies to everyone covered
  // by the calendar's scope.
  scope: PerHolidayScopeRow[];
}

export interface CalendarScopeRow {
  id?: number;
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
}

export interface HolidayCalendarSummary {
  id: number;
  name: string;
  description: string | null;
  status: HolidayCalendarStatus;
  holidayCount: number;
  updatedAt: string;
}

export interface HolidayCalendarDetail {
  id: number;
  name: string;
  description: string | null;
  status: HolidayCalendarStatus;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  holidays: HolidayRow[];
  scope: CalendarScopeRow[];
  /** Ids of existing holidays linked to this team via holiday_team_links. */
  holidayIds: number[];
}

export interface HolidayCalendarUpsert {
  name: string;
  description: string | null;
  status: HolidayCalendarStatus;
  holidays: HolidayRow[];
  scope: CalendarScopeRow[];
  /** Link these existing holidays to the team. */
  holidayIds?: number[];
}

export class HolidayCalendarApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HolidayCalendarApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/admin/holiday-calendars${path}`;
}

async function parseErr(res: Response): Promise<HolidayCalendarApiError> {
  const body = await res.json().catch(() => ({}));
  const err = (body as { error?: { code?: string; message?: string } }).error;
  return new HolidayCalendarApiError(
    res.status,
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? `Request failed with status ${res.status}`,
  );
}

export async function listHolidayCalendars(): Promise<HolidayCalendarSummary[]> {
  const res = await fetch(buildUrl(""), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: HolidayCalendarSummary[] };
  return body.data;
}

export async function getHolidayCalendar(
  id: number,
): Promise<HolidayCalendarDetail> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: HolidayCalendarDetail };
  return body.data;
}

export async function createHolidayCalendar(
  body: HolidayCalendarUpsert,
): Promise<HolidayCalendarDetail> {
  const res = await fetch(buildUrl(""), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: HolidayCalendarDetail };
  return data.data;
}

export async function updateHolidayCalendar(
  id: number,
  body: Partial<HolidayCalendarUpsert>,
): Promise<HolidayCalendarDetail> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: HolidayCalendarDetail };
  return data.data;
}

export async function deleteHolidayCalendar(id: number): Promise<void> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
}

// ───────────── Global holiday CRUD (M-team-links) ───────────────────────

/** Holiday returned by the global-view endpoint. teamIds are the calendar
 *  ids it's linked to (1..N). */
export interface GlobalHoliday {
  id: number;
  date: string;
  name: string;
  type: HolidayType;
  isHalfDay: boolean;
  description: string | null;
  scope: PerHolidayScopeRow[];
  teamIds: number[];
}

export interface GlobalHolidayUpsert {
  date: string;
  name: string;
  type: HolidayType;
  isHalfDay: boolean;
  description: string | null;
  scope: PerHolidayScopeRow[];
  teamIds: number[];
}

function globalUrl(path: string): string {
  return `${API_BASE}/api/admin/holidays${path}`;
}

export async function listGlobalHolidays(opts?: {
  from?: string;
  to?: string;
}): Promise<GlobalHoliday[]> {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  const qs = params.toString();
  const res = await fetch(globalUrl(qs ? `?${qs}` : ""), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: GlobalHoliday[] };
  return body.data;
}

export async function createGlobalHoliday(
  body: GlobalHolidayUpsert,
): Promise<GlobalHoliday> {
  const res = await fetch(globalUrl(""), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: GlobalHoliday };
  return data.data;
}

export async function updateGlobalHoliday(
  id: number,
  body: Partial<GlobalHolidayUpsert>,
): Promise<GlobalHoliday> {
  const res = await fetch(globalUrl(`/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: GlobalHoliday };
  return data.data;
}

export async function deleteGlobalHoliday(id: number): Promise<void> {
  const res = await fetch(globalUrl(`/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
}
