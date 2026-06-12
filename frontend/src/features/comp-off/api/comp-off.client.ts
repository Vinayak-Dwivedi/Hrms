// Comp-Off workflow client. Talks to /api/comp-off with credentials.

import { API_BASE } from "@/lib/hrms-client";

export type CompOffStatus = "Pending" | "Approved" | "Rejected";

export interface CompOffRequest {
  id: number;
  employeeId: number;
  employeeName: string | null;
  workedDate: string;
  days: number;
  reason: string;
  status: CompOffStatus;
  decidedAt: string | null;
  remarks: string | null;
  createdAt: string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/api/comp-off${path}`, {
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
    throw new Error(err?.message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function createCompOffRequest(input: {
  workedDate: string;
  reason: string;
}): Promise<CompOffRequest> {
  const r = await call<{ data: CompOffRequest }>("/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return r.data;
}

export async function listMyCompOffRequests(): Promise<CompOffRequest[]> {
  const r = await call<{ data: CompOffRequest[] }>("/requests");
  return r.data;
}

export async function listCompOffApprovals(): Promise<CompOffRequest[]> {
  const r = await call<{ data: CompOffRequest[] }>("/approvals");
  return r.data;
}

export async function approveCompOff(id: number): Promise<void> {
  await call(`/approvals/${id}/approve`, { method: "POST" });
}

export async function rejectCompOff(id: number, remarks?: string): Promise<void> {
  await call(`/approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ remarks: remarks ?? null }),
  });
}
