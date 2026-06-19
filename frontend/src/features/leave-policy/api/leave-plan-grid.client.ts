// Frontend client for the Leave Policy grid (scope-first allocation matrix).
// Talks to /api/admin/leave-plans/grid with credentials so the auth cookie is
// sent. Each org leaf (Location → Department → Sub-department) maps to one
// grid-managed leave_plan keyed by a scope key ("B2:D3:S5" / "B2:D3").

import { API_BASE } from "@/lib/hrms-client";

export interface GridLeaveType {
  id: number;
  code: string;
  name: string;
}

export interface GridWeeklyOff {
  id: number;
  name: string;
}

export interface GridSubDepartment {
  id: number;
  name: string;
}

export interface GridDepartment {
  departmentId: number;
  departmentName: string;
  subDepartments: GridSubDepartment[];
}

export interface GridLocation {
  branchId: number;
  branchName: string;
  departments: GridDepartment[];
}

export interface GridCell {
  planId: number;
  weeklyOffConfigId: number | null;
  status: string;
  // keyed by leaveTypeId → annual quota
  allocations: Record<number, number>;
}

export interface LeaveGridData {
  leaveTypes: GridLeaveType[];
  weeklyOffs: GridWeeklyOff[];
  tree: GridLocation[];
  cells: Record<string, GridCell>;
}

export interface GridUpsertBody {
  branchId: number;
  departmentId: number;
  subDepartmentId: number | null;
  weeklyOffConfigId: number | null;
  allocations: { leaveTypeId: number; annualQuota: number }[];
}

export interface GridUpsertResult {
  scopeKey: string;
  planId: number | null;
  filled: boolean;
  balancesSeeded: number;
}

export class LeaveGridApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LeaveGridApiError";
    this.status = status;
    this.code = code;
  }
}

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: { balancesSeeded?: number } }> {
  const res = await fetch(`${API_BASE}/api/admin/leave-plans${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = (body as { error?: { code?: string; message?: string } }).error;
    throw new LeaveGridApiError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? `Request failed with status ${res.status}`,
    );
  }
  return res.json();
}

/** Compose the scope key for an org leaf, matching the backend convention. */
export function scopeKeyOf(
  branchId: number,
  departmentId: number,
  subDepartmentId: number | null,
): string {
  return subDepartmentId != null
    ? `B${branchId}:D${departmentId}:S${subDepartmentId}`
    : `B${branchId}:D${departmentId}`;
}

export async function getLeaveGrid(): Promise<LeaveGridData> {
  const r = await call<LeaveGridData>("/grid");
  return r.data;
}

export async function upsertLeaveGridCell(
  body: GridUpsertBody,
): Promise<GridUpsertResult> {
  const r = await call<{
    scopeKey: string;
    planId: number | null;
    filled: boolean;
  }>("/grid", { method: "PUT", body: JSON.stringify(body) });
  return { ...r.data, balancesSeeded: r.meta?.balancesSeeded ?? 0 };
}
