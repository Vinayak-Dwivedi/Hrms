// Approval workflow definition client. Talks to /api/admin/approval-workflows.

import { API_BASE } from "@/lib/hrms-client";
import type { HierarchyScopeRow } from "@/features/leave-policy/lib/leave-plan-scope";

export type WorkflowStage = "Manager" | "DeptHead" | "HR";

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  Manager: "Manager",
  DeptHead: "Department Head",
  HR: "HR",
};


export interface ApprovalWorkflow {
  id: number;
  name: string;
  description: string | null;
  stages: WorkflowStage[];
  scope: HierarchyScopeRow[];
  isActive: boolean;
}

export interface ApprovalWorkflowUpsert {
  name: string;
  description: string | null;
  stages: WorkflowStage[];
  scope: HierarchyScopeRow[];
  isActive: boolean;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/api/admin/approval-workflows${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = (body as { error?: { message?: string } }).error;
    throw new Error(err?.message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function listWorkflows(): Promise<ApprovalWorkflow[]> {
  const r = await call<{ data: ApprovalWorkflow[] }>("");
  return r.data.map((w) => ({
    ...w,
    scope: w.scope ?? [],
  }));
}

export async function createWorkflow(
  body: ApprovalWorkflowUpsert,
): Promise<ApprovalWorkflow> {
  const r = await call<{ data: ApprovalWorkflow }>("", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { ...r.data, scope: r.data.scope ?? [] };
}

export async function updateWorkflow(
  id: number,
  body: Partial<ApprovalWorkflowUpsert>,
): Promise<ApprovalWorkflow> {
  const r = await call<{ data: ApprovalWorkflow }>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return { ...r.data, scope: r.data.scope ?? [] };
}

export async function deleteWorkflow(id: number): Promise<void> {
  await call(`/${id}`, { method: "DELETE" });
}
