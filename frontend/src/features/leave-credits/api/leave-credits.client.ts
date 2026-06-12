// Admin client for the leave-credit engine (M6). Talks to
// /api/admin/leave-credits with credentials: 'include'.

import { API_BASE } from "@/lib/hrms-client";

export type CreditKind =
  | "Accrual"
  | "Grant"
  | "Adjustment"
  | "CarryForward"
  | "Lapse"
  | "Encashment";

export interface AccrualPolicySummary {
  policyId: number;
  policyName: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  config: {
    frequency: "Monthly" | "Yearly" | "None";
    monthlyAmount?: number;
    yearlyAmount?: number;
    yearlyGrantMonth?: number;
  };
}

export interface CreditTransactionRow {
  id: number;
  employeeId: number;
  employeeName: string | null;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  policyId: number | null;
  amount: number;
  kind: CreditKind;
  period: string;
  reason: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export interface CreditRunSummary {
  attempted: number;
  applied: number;
  skipped: number;
  errors: number;
  errorSamples: Array<{
    employeeId: number;
    leaveTypeId: number;
    error: string;
  }>;
}

export class LeaveCreditApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LeaveCreditApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseErr(res: Response): Promise<LeaveCreditApiError> {
  const body = await res.json().catch(() => ({}));
  const err = (body as { error?: { code?: string; message?: string } }).error;
  return new LeaveCreditApiError(
    res.status,
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? `Request failed with status ${res.status}`,
  );
}

function url(path: string) {
  return `${API_BASE}/api/admin/leave-credits${path}`;
}

export async function listAccrualPolicies(): Promise<AccrualPolicySummary[]> {
  const res = await fetch(url("/policies"), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: AccrualPolicySummary[] };
  return body.data;
}

export interface ListTransactionsOpts {
  employeeId?: number;
  leaveTypeId?: number;
  period?: string;
  limit?: number;
}

export async function listCreditTransactions(
  opts: ListTransactionsOpts = {},
): Promise<CreditTransactionRow[]> {
  const params = new URLSearchParams();
  if (opts.employeeId) params.set("employeeId", String(opts.employeeId));
  if (opts.leaveTypeId) params.set("leaveTypeId", String(opts.leaveTypeId));
  if (opts.period) params.set("period", opts.period);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const res = await fetch(url(`/transactions${qs ? `?${qs}` : ""}`), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: CreditTransactionRow[] };
  return body.data;
}

export interface RunOpts {
  period?: string; // YYYY-MM for monthly
  year?: number; // for yearly
  forceMonth?: number; // override the calendar gate
  employeeIds?: number[];
  dryRun?: boolean;
}

export async function runMonthlyAccrual(
  opts: RunOpts = {},
): Promise<{ summary: CreditRunSummary; dryRun: boolean }> {
  const res = await fetch(url("/run/monthly"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw await parseErr(res);
  return (await res.json()) as { summary: CreditRunSummary; dryRun: boolean };
}

export async function runYearlyGrant(
  opts: RunOpts = {},
): Promise<{ summary: CreditRunSummary; dryRun: boolean }> {
  const res = await fetch(url("/run/yearly"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw await parseErr(res);
  return (await res.json()) as { summary: CreditRunSummary; dryRun: boolean };
}
