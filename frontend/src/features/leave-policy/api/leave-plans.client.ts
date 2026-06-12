// Frontend client for Leave Plans (Phase 4 "Leave Policies"). Talks to
// /api/admin/leave-plans with credentials so the auth cookie is sent.

import { API_BASE } from "@/lib/hrms-client";

export type LeavePlanStatus = "Draft" | "Active" | "Archived";
export type AccrualMethod = "Annual" | "Monthly";

export type PlanScopeType =
  | "Company"
  | "Branch"
  | "Location"
  | "Department"
  | "SubDepartment"
  | "Designation"
  | "Grade"
  | "EmploymentType"
  | "Employee";

export interface PlanScopeRow {
  id?: number;
  scopeType: PlanScopeType;
  scopeId: number | null;
  priority: number;
}

export interface PlanAllocation {
  leaveTypeId: number;
  code: string;
  typeName: string;
  annualQuota: number;
}

export interface LeavePlanSummary {
  id: number;
  name: string;
  description: string | null;
  status: LeavePlanStatus;
  isDefault: boolean;
  weeklyOffConfigId: number | null;
  compOffEnabled: boolean;
  updatedAt: string;
  allocations: { code: string; annualQuota: number }[];
}

export interface LeavePlanDetail {
  id: number;
  name: string;
  description: string | null;
  status: LeavePlanStatus;
  isDefault: boolean;
  weeklyOffConfigId: number | null;
  compOffEnabled: boolean;
  accrualMethod: AccrualMethod;
  carryForwardCap: number | null;
  proRataJoiners: boolean;
  approvalWorkflowId: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  allocations: PlanAllocation[];
  scope: PlanScopeRow[];
}

export interface LeavePlanUpsert {
  name: string;
  description: string | null;
  status: LeavePlanStatus;
  isDefault: boolean;
  weeklyOffConfigId: number | null;
  compOffEnabled: boolean;
  accrualMethod: AccrualMethod;
  carryForwardCap: number | null;
  proRataJoiners: boolean;
  approvalWorkflowId: number | null;
  allocations: { leaveTypeId: number; annualQuota: number }[];
  scope: PlanScopeRow[];
}

export class LeavePlanApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LeavePlanApiError";
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
    throw new LeavePlanApiError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? `Request failed with status ${res.status}`,
    );
  }
  return res.json();
}

export async function listLeavePlans(): Promise<LeavePlanSummary[]> {
  const r = await call<LeavePlanSummary[]>("");
  return r.data;
}

export async function getLeavePlan(id: number): Promise<LeavePlanDetail> {
  const r = await call<LeavePlanDetail>(`/${id}`);
  return r.data;
}

export async function createLeavePlan(
  body: LeavePlanUpsert,
): Promise<{ plan: LeavePlanDetail; balancesSeeded: number }> {
  const r = await call<LeavePlanDetail>("", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { plan: r.data, balancesSeeded: r.meta?.balancesSeeded ?? 0 };
}

export async function updateLeavePlan(
  id: number,
  body: Partial<LeavePlanUpsert>,
): Promise<{ plan: LeavePlanDetail; balancesSeeded: number }> {
  const r = await call<LeavePlanDetail>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return { plan: r.data, balancesSeeded: r.meta?.balancesSeeded ?? 0 };
}

export async function archiveLeavePlan(id: number): Promise<void> {
  await call<LeavePlanDetail>(`/${id}`, { method: "DELETE" });
}
