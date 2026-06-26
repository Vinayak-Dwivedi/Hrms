import { API_BASE } from "@/lib/hrms-client";

export type ShiftStatus = "Draft" | "Published" | "Archived";

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

export interface ShiftScopeRow {
  id?: number;
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
}

export interface ShiftSummary {
  id: number;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  startTimeDisplay: string;
  endTimeDisplay: string;
  status: ShiftStatus;
  isDefault: boolean;
  updatedAt: string;
}

export interface ShiftDetail {
  id: number;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  startTimeDisplay: string;
  endTimeDisplay: string;
  status: ShiftStatus;
  isDefault: boolean;
  graceMinutes: number;
  breakMinutes: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  scope: ShiftScopeRow[];
}

export interface ShiftUpsert {
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  isDefault: boolean;
  graceMinutes: number;
  breakMinutes: number;
  scope: ShiftScopeRow[];
}

export interface StandardShiftTiming {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  timingDisplay: string;
}

export const FALLBACK_STANDARD_SHIFTS: StandardShiftTiming[] = [
  {
    key: "morning",
    label: "Morning Shift",
    startTime: "09:00",
    endTime: "19:00",
    timingDisplay: "09:00 AM – 07:00 PM",
  },
  {
    key: "evening",
    label: "Evening Shift",
    startTime: "13:00",
    endTime: "22:00",
    timingDisplay: "01:00 PM – 10:00 PM",
  },
  {
    key: "night",
    label: "Night Shift",
    startTime: "22:00",
    endTime: "07:00",
    timingDisplay: "10:00 PM – 07:00 AM",
  },
];

export class ShiftConfigApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ShiftConfigApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/admin/shift-configs${path}`;
}

async function parseErr(res: Response): Promise<ShiftConfigApiError> {
  const body = await res.json().catch(() => ({}));
  const err = (body as { error?: { code?: string; message?: string } }).error;
  return new ShiftConfigApiError(
    res.status,
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? `Request failed with status ${res.status}`,
  );
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: T };
  return body.data;
}

export async function listShiftConfigs(status?: ShiftStatus): Promise<ShiftSummary[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${API_BASE}/api/admin/shift-configs${qs}`, {
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: ShiftSummary[] };
  return body.data;
}

export async function getShiftConfig(id: number): Promise<ShiftDetail> {
  return call<ShiftDetail>(`/${id}`);
}

export async function createShiftConfig(payload: ShiftUpsert): Promise<ShiftDetail> {
  return call<ShiftDetail>("/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateShiftConfig(
  id: number,
  payload: Partial<ShiftUpsert>,
): Promise<ShiftDetail> {
  return call<ShiftDetail>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function archiveShiftConfig(id: number): Promise<void> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
}

export async function fetchStandardShiftTimings(): Promise<StandardShiftTiming[]> {
  try {
    return await call<StandardShiftTiming[]>("/standards");
  } catch {
    return FALLBACK_STANDARD_SHIFTS;
  }
}
