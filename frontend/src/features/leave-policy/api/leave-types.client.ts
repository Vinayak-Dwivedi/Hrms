// Admin leave-type CRUD client. Talks to /api/admin/leave-types with
// credentials: 'include' so the hrms_at cookie is sent.

import { API_BASE } from "@/lib/hrms-client";

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  color: string;
  description: string | null;
  isActive: boolean;
  isPaid: boolean;
  allowHalfDay: boolean;
  allowNegativeBalance: boolean;
  genderRestriction: "Male" | "Female" | null;
  minNoticeDays: number;
  requiresProofAfterDays: number | null;
  maxContinuousDays: number | null;
  hourlyLeaveAllowed: boolean;
  carryForwardAllowed: boolean;
  encashmentAllowed: boolean;
  attachmentRequired: boolean;
  allowedInProbation: boolean;
}

export type LeaveTypeUpsert = Omit<LeaveType, "id">;

export class LeaveTypeApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LeaveTypeApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/admin/leave-types${path}`;
}

async function parseErr(res: Response): Promise<LeaveTypeApiError> {
  const body = await res.json().catch(() => ({}));
  const err = (body as { error?: { code?: string; message?: string } }).error;
  return new LeaveTypeApiError(
    res.status,
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? `Request failed with status ${res.status}`,
  );
}

export async function listLeaveTypes(): Promise<LeaveType[]> {
  const res = await fetch(buildUrl(""), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: LeaveType[] };
  return body.data;
}

export async function createLeaveType(
  body: LeaveTypeUpsert,
): Promise<LeaveType> {
  const res = await fetch(buildUrl(""), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: LeaveType };
  return data.data;
}

export async function updateLeaveType(
  id: number,
  body: Partial<LeaveTypeUpsert>,
): Promise<LeaveType> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: LeaveType };
  return data.data;
}

export async function deactivateLeaveType(id: number): Promise<LeaveType> {
  const res = await fetch(buildUrl(`/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const data = (await res.json()) as { data: LeaveType };
  return data.data;
}
