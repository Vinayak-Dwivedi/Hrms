// Frontend client for the leave-policies admin API + the employee-side
// "resolved policy" read endpoint.

import { API_BASE } from "@/lib/hrms-client";
import type { Recipient } from "../RecipientPicker";

export type ScopeType =
  | "Company"
  | "Branch"
  | "Department"
  | "Designation"
  | "Grade"
  | "EmploymentType"
  | "Process"
  | "Employee";

export interface PolicyScope {
  id?: number;
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
}

export interface PolicyCriterion {
  field: string;
  operator: string;
  value: string;
}

export interface PolicyApproval {
  id?: number;
  name: string;
  description?: string | null;
  criteria: PolicyCriterion[];
  outcome: "AutoApprove" | "AutoReject" | "Route";
  fromMode: string;
  toRecipients: Recipient[];
  ccRecipients: Recipient[];
  bccRecipients: Recipient[];
  replyToRecipients: Recipient[];
  subject: string;
  body: string;
  isActive: boolean;
}

export interface LeavePolicy {
  id: number;
  leaveTypeId: number;
  name: string;
  description: string | null;
  status: "Draft" | "Active" | "Archived";
  isDefault: boolean;
  settings: Record<string, unknown>;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  scope: PolicyScope[];
  approvals: PolicyApproval[];
}

export type LeavePolicyUpsert = {
  leaveTypeId: number;
  name: string;
  description?: string | null;
  status?: "Draft" | "Active" | "Archived";
  isDefault?: boolean;
  settings: Record<string, unknown>;
  scope: PolicyScope[];
  approvals: PolicyApproval[];
};

export class PolicyApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PolicyApiError";
    this.status = status;
    this.code = code;
  }
}

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T }> {
  const res = await fetch(`${API_BASE}${path}`, {
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
    throw new PolicyApiError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? `Request failed with status ${res.status}`,
    );
  }
  return res.json() as Promise<{ data: T }>;
}

// ───── admin CRUD ─────────────────────────────────────────────────────────

export async function listPolicies(args: {
  leaveTypeCode?: string;
  leaveTypeId?: number;
}): Promise<LeavePolicy[]> {
  const params = new URLSearchParams();
  if (args.leaveTypeCode) params.set("leaveTypeCode", args.leaveTypeCode);
  if (args.leaveTypeId) params.set("leaveTypeId", String(args.leaveTypeId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const r = await call<LeavePolicy[]>(`/api/admin/leave-policies${qs}`);
  return r.data;
}

export async function getPolicy(id: number): Promise<LeavePolicy> {
  const r = await call<LeavePolicy>(`/api/admin/leave-policies/${id}`);
  return r.data;
}

export async function createPolicy(
  body: LeavePolicyUpsert,
): Promise<LeavePolicy> {
  const r = await call<LeavePolicy>("/api/admin/leave-policies", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function updatePolicy(
  id: number,
  body: Partial<LeavePolicyUpsert>,
): Promise<LeavePolicy> {
  const r = await call<LeavePolicy>(`/api/admin/leave-policies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function archivePolicy(id: number): Promise<LeavePolicy> {
  const r = await call<LeavePolicy>(`/api/admin/leave-policies/${id}`, {
    method: "DELETE",
  });
  return r.data;
}

// ───── helper: find-or-default for a leave-type-bound section ─────────────

// Most policy editors (Comp Off, Approval Flow) live as "the one policy for
// this leave_type" — we don't need a list/edit-by-id UI. Grab the default
// (or first Active) policy for the requested code; if there is none, return
// null so the caller can render a fresh form.
export async function getPolicyForLeaveType(
  leaveTypeCode: string,
): Promise<LeavePolicy | null> {
  const all = await listPolicies({ leaveTypeCode });
  if (all.length === 0) return null;
  const def = all.find((p) => p.isDefault) ?? all[0];
  return def ? getPolicy(def.id) : null;
}

// ───── employee-side: which policy applies to me? ─────────────────────────

export interface ResolvedPolicy {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  policy: {
    id: number;
    name: string;
    description: string | null;
    settings: Record<string, unknown>;
    isDefault: boolean;
    matchedScope: { scopeType: ScopeType; scopeId: number | null } | null;
    matchedReason: string;
  } | null;
}

export async function getMyResolvedPolicy(
  leaveTypeCode: string,
): Promise<ResolvedPolicy> {
  const r = await call<ResolvedPolicy>(
    `/api/me/leave-policy?leaveTypeCode=${encodeURIComponent(leaveTypeCode)}`,
  );
  return r.data;
}
