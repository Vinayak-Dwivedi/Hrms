import { API_BASE } from "@/lib/hrms-client";

export type ResolvedEmployeeShift = {
  configId: number;
  name: string;
  startTime: string;
  endTime: string;
  shiftTiming: string;
  graceMinutes: number;
  breakMinutes: number;
};

export type EmployeeShiftAssignment = {
  overrideConfigId: number | null;
  resolved: ResolvedEmployeeShift | null;
};

export class EmployeeShiftApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "EmployeeShiftApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(employeeId: number): string {
  return `${API_BASE}/api/hrms/employees/${employeeId}/shift`;
}

async function parseErr(res: Response): Promise<EmployeeShiftApiError> {
  const body = await res.json().catch(() => ({}));
  const err = (body as { error?: { code?: string; message?: string } }).error;
  return new EmployeeShiftApiError(
    res.status,
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? `Request failed with status ${res.status}`,
  );
}

export async function fetchEmployeeShift(
  employeeId: number,
): Promise<EmployeeShiftAssignment> {
  const res = await fetch(buildUrl(employeeId), { credentials: "include" });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: EmployeeShiftAssignment };
  return body.data;
}

export async function updateEmployeeShift(
  employeeId: number,
  shiftConfigId: number | null,
): Promise<EmployeeShiftAssignment> {
  const res = await fetch(buildUrl(employeeId), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shiftConfigId }),
  });
  if (!res.ok) throw await parseErr(res);
  const body = (await res.json()) as { data: EmployeeShiftAssignment };
  return body.data;
}

export function formatEmployeeShiftLabel(
  assignment: EmployeeShiftAssignment | null | undefined,
): string {
  if (!assignment?.resolved) return "—";
  const { name, shiftTiming } = assignment.resolved;
  return `${name} — ${shiftTiming}`;
}
