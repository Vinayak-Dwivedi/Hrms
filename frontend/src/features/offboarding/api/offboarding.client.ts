// Frontend client for the Offboarding / Resignation module
// (/api/hrms/offboarding/*). Mirrors the locations.client.ts shape.

import { API_BASE } from "@/lib/hrms-client";

// ── Types ──

export type ValidationItem = {
  code: string;
  level: "warning" | "info" | "ok";
  message: string;
};

export type ExitReasonOption = { id: number; label: string };

export type ExitReason = {
  id: number;
  label: string;
  isActive: boolean;
  sortOrder: number;
};

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

export type FlowScopeRow = {
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
};

export type ResignationFlow = {
  id: number;
  name: string;
  description: string | null;
  noticePeriodDays: number;
  buyoutAllowed: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  scope: FlowScopeRow[];
};

export type ResignationFlowDetail = ResignationFlow & { scope: FlowScopeRow[] };

export type ResignationStatus =
  | "Submitted"
  | "ManagerDiscussion"
  | "ManagerApproved"
  | "ManagerRejected"
  | "HRApproved"
  | "OnHold"
  | "Rejected"
  | "Withdrawn";

export type EmployeeRef = {
  empId: string;
  firstName: string;
  lastName: string;
  departmentId: number | null;
  reportingManagerId: number | null;
  joiningDate: string;
};

export type Resignation = {
  id: number;
  employeeId: number;
  lastWorkingDate: string;
  reason: string;
  detailedRemark: string | null;
  attachmentPath: string | null;
  buyoutRequested: boolean;
  buyoutStatus: "None" | "Requested" | "Approved" | "Rejected";
  buyoutDecisionNote: string | null;
  status: ResignationStatus;
  submittedOn: string;
  noticePeriodDays: number | null;
  validation: ValidationItem[];
  managerDecision: "Approved" | "Rejected" | null;
  managerRemarks: string | null;
  recommendedLwd: string | null;
  knowledgeTransferRequired: boolean | null;
  replacementRequired: boolean | null;
  criticalResource: boolean | null;
  hrDecision: "Approved" | "Rejected" | null;
  hrRemarks: string | null;
  modifiedLwd: string | null;
  leaveEncashmentEligible: boolean | null;
  recoveryAmount: string | null;
  gratuityEligible: boolean | null;
  finalSettlementEligible: boolean | null;
  currentStage: number;
  createdAt: string;
  /** Present once HR approval has spawned an offboarding case. */
  caseNumber?: string | null;
  caseStatus?: string | null;
};

export type ResignationWithEmployee = Resignation & { employee: EmployeeRef };

export type OffboardingCase = {
  id: number;
  caseNumber: string;
  resignationId: number;
  employeeId: number;
  departmentId: number | null;
  reportingManagerId: number | null;
  dateOfJoining: string | null;
  resignationDate: string;
  lastWorkingDate: string;
  noticePeriodDays: number | null;
  status:
    | "OffboardingInitiated"
    | "ClearancesComplete"
    | "FnFComplete"
    | "Closed"
    | "OnHold";
  createdAt: string;
  employee: EmployeeRef;
  departmentName: string | null;
  // Enriched fields returned by getCase (single-case detail) only.
  subDepartmentName?: string | null;
  reportingManagerName?: string | null;
  buyoutRequested?: boolean;
  buyoutStatus?: "None" | "Requested" | "Approved" | "Rejected";
  resignationReason?: string | null;
  fnfStatus?: "Processing" | "Approved" | "Paid" | null;
};

export type SubmitResult = {
  resignation: Resignation;
  validation: ValidationItem[];
};

// ── Error + fetch plumbing ──

type ApiErrorBody = { error?: { code?: string; message?: string; details?: unknown } };

export class OffboardingApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "OffboardingApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms/offboarding${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseApiError(res: Response): Promise<OffboardingApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  return new OffboardingApiError(
    res.status,
    body.error?.code ?? "UNKNOWN",
    body.error?.message ?? res.statusText ?? "Request failed.",
    body.error?.details,
  );
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
    throw await parseApiError(res);
  }
  return (await res.json()) as T;
}

function unwrap<T>(p: Promise<{ data: T }>): Promise<T> {
  return p.then((r) => r.data);
}

// ── Employee ──

export function listActiveExitReasons(): Promise<ExitReasonOption[]> {
  return unwrap(jsonFetch<{ data: ExitReasonOption[] }>("/exit-reasons/active"));
}

export async function submitResignation(input: {
  lastWorkingDate: string;
  reason: string;
  detailedRemark: string;
  buyoutRequested: boolean;
  file?: File | null;
}): Promise<SubmitResult> {
  const fd = new FormData();
  fd.append("lastWorkingDate", input.lastWorkingDate);
  fd.append("reason", input.reason);
  fd.append("detailedRemark", input.detailedRemark);
  fd.append("buyoutRequested", String(input.buyoutRequested));
  if (input.file) fd.append("attachment", input.file);

  // Multipart — let the browser set the Content-Type boundary.
  const res = await fetch(buildUrl("/resignations"), {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
    throw await parseApiError(res);
  }
  return ((await res.json()) as { data: SubmitResult }).data;
}

export function getMyResignations(): Promise<Resignation[]> {
  return unwrap(jsonFetch<{ data: Resignation[] }>("/resignations/mine"));
}

export function withdrawResignation(id: number): Promise<Resignation> {
  return unwrap(jsonFetch<{ data: Resignation }>(`/resignations/${id}/withdraw`, { method: "POST" }));
}

// ── Manager ──

export function listManagerResignations(): Promise<ResignationWithEmployee[]> {
  return unwrap(jsonFetch<{ data: ResignationWithEmployee[] }>("/manager/resignations"));
}

export function managerApprove(
  id: number,
  body: {
    recommendedLwd?: string | null;
    knowledgeTransferRequired?: boolean;
    replacementRequired?: boolean;
    criticalResource?: boolean;
    remarks?: string | null;
  },
): Promise<Resignation> {
  return unwrap(
    jsonFetch<{ data: Resignation }>(`/manager/resignations/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function managerReject(id: number, remarks?: string | null): Promise<Resignation> {
  return unwrap(
    jsonFetch<{ data: Resignation }>(`/manager/resignations/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ remarks }),
    }),
  );
}

export function managerRequestDiscussion(
  id: number,
  remarks?: string | null,
): Promise<Resignation> {
  return unwrap(
    jsonFetch<{ data: Resignation }>(`/manager/resignations/${id}/discuss`, {
      method: "POST",
      body: JSON.stringify({ remarks }),
    }),
  );
}

// ── HR ──

export function listHrResignations(): Promise<ResignationWithEmployee[]> {
  return unwrap(jsonFetch<{ data: ResignationWithEmployee[] }>("/hr/resignations"));
}

export function hrApprove(
  id: number,
  body: {
    modifiedLwd?: string | null;
    leaveEncashmentEligible?: boolean;
    recoveryAmount?: number | null;
    gratuityEligible?: boolean;
    finalSettlementEligible?: boolean;
    remarks?: string | null;
  },
): Promise<{ resignation: Resignation; case: OffboardingCase }> {
  return unwrap(
    jsonFetch<{ data: { resignation: Resignation; case: OffboardingCase } }>(
      `/hr/resignations/${id}/approve`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  );
}

export function hrHold(id: number, remarks?: string | null): Promise<Resignation> {
  return unwrap(
    jsonFetch<{ data: Resignation }>(`/hr/resignations/${id}/hold`, {
      method: "POST",
      body: JSON.stringify({ remarks }),
    }),
  );
}

export function hrResume(id: number): Promise<Resignation> {
  return unwrap(
    jsonFetch<{ data: Resignation }>(`/hr/resignations/${id}/resume`, {
      method: "POST",
    }),
  );
}

export function hrReject(id: number, remarks?: string | null): Promise<Resignation> {
  return unwrap(
    jsonFetch<{ data: Resignation }>(`/hr/resignations/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ remarks }),
    }),
  );
}

export function hrBuyoutDecision(
  id: number,
  decision: "Approved" | "Rejected",
  note?: string | null,
): Promise<Resignation> {
  return unwrap(
    jsonFetch<{ data: Resignation }>(`/hr/resignations/${id}/buyout`, {
      method: "POST",
      body: JSON.stringify({ decision, note }),
    }),
  );
}

// ── Admin: flows ──

export function listFlows(): Promise<ResignationFlow[]> {
  return unwrap(jsonFetch<{ data: ResignationFlow[] }>("/flows"));
}

export function getFlow(id: number): Promise<ResignationFlowDetail> {
  return unwrap(jsonFetch<{ data: ResignationFlowDetail }>(`/flows/${id}`));
}

export type FlowUpsertPayload = {
  name: string;
  description?: string | null;
  noticePeriodDays: number;
  buyoutAllowed: boolean;
  isActive: boolean;
  isDefault: boolean;
  scope: FlowScopeRow[];
};

export function createFlow(body: FlowUpsertPayload): Promise<ResignationFlow> {
  return unwrap(
    jsonFetch<{ data: ResignationFlow }>("/flows", { method: "POST", body: JSON.stringify(body) }),
  );
}

export function updateFlow(id: number, body: Partial<FlowUpsertPayload>): Promise<ResignationFlow> {
  return unwrap(
    jsonFetch<{ data: ResignationFlow }>(`/flows/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export function deleteFlow(id: number): Promise<ResignationFlow> {
  return unwrap(jsonFetch<{ data: ResignationFlow }>(`/flows/${id}`, { method: "DELETE" }));
}

// ── Manager exit requests ──

export type ManagerExitType = "Absconding" | "ResignedWithoutNotice";

export type ExitRequestStatus = "Pending" | "Approved" | "Rejected";

export type EmployeeExitRequest = {
  id: number;
  employeeId: number;
  requestedBy: number;
  exitType: ManagerExitType;
  requestedLwd: string | null;
  evidenceNote: string | null;
  noticeRequiredDays: number | null;
  noticeServedDays: number;
  settlementRule: string | null;
  accessRevokeTiming: "Immediate" | "OnLWD";
  status: ExitRequestStatus;
  hrActionBy: number | null;
  hrRemarks: string | null;
  activeLeavesSnapshot: unknown[];
  createdAt: string;
  updatedAt: string;
  employee: { empId: string; firstName: string; lastName: string };
};

export type EmployeeExit = {
  id: number;
  employeeId: number;
  exitType: string;
  initiatedBy: "Manager" | "HR";
  exitRequestId: number | null;
  resignationId: number | null;
  lastWorkingDate: string;
  effectiveDate: string;
  noticeRequiredDays: number | null;
  noticeServedDays: number | null;
  settlementRule: string | null;
  terminationReasonCode: string | null;
  remarks: string | null;
  isBackdated: boolean;
  accessRevokedAt: string | null;
  createdAt: string;
};

export function createExitRequest(body: {
  employeeId: number;
  exitType: ManagerExitType;
  requestedLwd: string;
  evidenceNote: string;
  noticeServedDays?: number;
}): Promise<{ request: EmployeeExitRequest; isBackdated: boolean; activeLeavesCount: number }> {
  return unwrap(
    jsonFetch<{ data: { request: EmployeeExitRequest; isBackdated: boolean; activeLeavesCount: number } }>(
      "/manager/exit-requests",
      { method: "POST", body: JSON.stringify(body) },
    ),
  );
}

export function listManagerExitRequests(): Promise<EmployeeExitRequest[]> {
  return unwrap(jsonFetch<{ data: EmployeeExitRequest[] }>("/manager/exit-requests"));
}

export function listHrExitRequests(): Promise<EmployeeExitRequest[]> {
  return unwrap(jsonFetch<{ data: EmployeeExitRequest[] }>("/hr/exit-requests"));
}

export function getHrExitRequest(id: number): Promise<EmployeeExitRequest> {
  return unwrap(jsonFetch<{ data: EmployeeExitRequest }>(`/hr/exit-requests/${id}`));
}

export function hrApproveExitRequest(
  id: number,
  body: {
    lastWorkingDate: string;
    effectiveDate?: string | null;
    settlementRule?: string | null;
    accessRevokeTiming?: "Immediate" | "OnLWD";
    hrRemarks?: string | null;
  },
): Promise<{ exit: EmployeeExit; isBackdated: boolean }> {
  return unwrap(
    jsonFetch<{ data: { exit: EmployeeExit; isBackdated: boolean } }>(`/hr/exit-requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function hrRejectExitRequest(id: number, hrRemarks?: string | null): Promise<EmployeeExitRequest> {
  return unwrap(
    jsonFetch<{ data: EmployeeExitRequest }>(`/hr/exit-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ hrRemarks }),
    }),
  );
}

export type DirectExitType =
  | "Resigned"
  | "ResignedWithoutNotice"
  | "ResignedWithPartialNotice"
  | "Absconding"
  | "Terminated";

export function hrDirectExit(
  employeeId: number,
  body: {
    exitType: DirectExitType;
    lastWorkingDate: string;
    effectiveDate?: string | null;
    noticeRequiredDays?: number | null;
    noticeServedDays?: number | null;
    settlementRule?: string | null;
    terminationReasonCode?: string | null;
    remarks?: string | null;
    accessRevokeTiming?: "Immediate" | "OnLWD";
  },
): Promise<{ exit: EmployeeExit; isBackdated: boolean; activeLeavesCount: number }> {
  return unwrap(
    jsonFetch<{ data: { exit: EmployeeExit; isBackdated: boolean; activeLeavesCount: number } }>(
      `/hr/employees/${employeeId}/direct-exit`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  );
}

export function getEmployeeExit(employeeId: number): Promise<EmployeeExit | null> {
  return unwrap(jsonFetch<{ data: EmployeeExit | null }>(`/hr/employees/${employeeId}/exit`));
}

export function listEmployeeExits(): Promise<EmployeeExit[]> {
  return unwrap(jsonFetch<{ data: EmployeeExit[] }>("/hr/exits"));
}

// ── Admin: exit reasons ──

export function listExitReasons(): Promise<ExitReason[]> {
  return unwrap(jsonFetch<{ data: ExitReason[] }>("/exit-reasons"));
}

export function createExitReason(body: {
  label: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<ExitReason> {
  return unwrap(
    jsonFetch<{ data: ExitReason }>("/exit-reasons", { method: "POST", body: JSON.stringify(body) }),
  );
}

export function updateExitReason(
  id: number,
  body: { label?: string; isActive?: boolean; sortOrder?: number },
): Promise<ExitReason> {
  return unwrap(
    jsonFetch<{ data: ExitReason }>(`/exit-reasons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export function deleteExitReason(id: number): Promise<ExitReason> {
  return unwrap(jsonFetch<{ data: ExitReason }>(`/exit-reasons/${id}`, { method: "DELETE" }));
}

// ── Cases ──

export function listCases(): Promise<OffboardingCase[]> {
  return unwrap(jsonFetch<{ data: OffboardingCase[] }>("/cases"));
}

export function getCase(id: number): Promise<OffboardingCase> {
  return unwrap(jsonFetch<{ data: OffboardingCase }>(`/cases/${id}`));
}

// ── Clearance (Phase 2) ──

export type BuiltinClearanceTeam =
  | "ReportingManager"
  | "IT"
  | "Admin"
  | "Finance"
  | "HR"
  | "Operations";
// Built-in teams plus any custom team slug admins create.
export type ClearanceTeam = BuiltinClearanceTeam | (string & {});

export type ClearanceTaskStatus = "Pending" | "Completed" | "NA";

export type ClearanceScopeRow = {
  scopeType: "Department" | "SubDepartment";
  scopeId: number;
};

export type ClearanceTemplate = {
  id: number;
  team: ClearanceTeam;
  name: string;
  tasks: string[];
  isActive: boolean;
  isBuiltin: boolean;
  scope: ClearanceScopeRow[];
  createdAt: string;
  updatedAt: string;
};

export type ClearanceTask = {
  id: number;
  label: string;
  status: ClearanceTaskStatus;
  remarks: string | null;
  completedAt: string | null;
};

export type ClearanceTeamGroup = {
  team: ClearanceTeam;
  status: "Pending" | "InProgress" | "Completed";
  tasks: ClearanceTask[];
};

export type CaseClearance = {
  caseId: number;
  groups: ClearanceTeamGroup[];
  summary: { total: number; done: number; allComplete: boolean };
};

export function listClearanceTemplates(): Promise<ClearanceTemplate[]> {
  return unwrap(jsonFetch<{ data: ClearanceTemplate[] }>("/clearance-templates"));
}

export function createClearanceTemplate(body: {
  name: string;
  tasks: string[];
  isActive: boolean;
  scope: ClearanceScopeRow[];
}): Promise<ClearanceTemplate> {
  return unwrap(
    jsonFetch<{ data: ClearanceTemplate }>("/clearance-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function updateClearanceTemplate(
  id: number,
  body: { name?: string; tasks?: string[]; isActive?: boolean; scope?: ClearanceScopeRow[] },
): Promise<ClearanceTemplate> {
  return unwrap(
    jsonFetch<{ data: ClearanceTemplate }>(`/clearance-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export function deleteClearanceTemplate(id: number): Promise<ClearanceTemplate> {
  return unwrap(
    jsonFetch<{ data: ClearanceTemplate }>(`/clearance-templates/${id}`, {
      method: "DELETE",
    }),
  );
}

export function getCaseClearance(caseId: number): Promise<CaseClearance> {
  return unwrap(jsonFetch<{ data: CaseClearance }>(`/cases/${caseId}/clearance`));
}

export function updateClearanceTask(
  caseId: number,
  taskId: number,
  body: { status?: ClearanceTaskStatus; remarks?: string | null },
): Promise<CaseClearance> {
  return unwrap(
    jsonFetch<{ data: CaseClearance }>(`/cases/${caseId}/clearance/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export const CLEARANCE_TEAM_LABEL: Record<BuiltinClearanceTeam, string> = {
  ReportingManager: "Reporting Manager",
  IT: "IT Team",
  Admin: "Admin Team",
  Finance: "Finance Team",
  HR: "HR Team",
  Operations: "Operations Team",
};

// Human label for a team — built-in label, or the custom team slug as-is.
export function clearanceTeamLabel(team: string): string {
  return CLEARANCE_TEAM_LABEL[team as BuiltinClearanceTeam] ?? team;
}

// ── My Clearances (team-scoped view) ──

export type MyClearanceCase = {
  caseId: number;
  caseNumber: string;
  status: string;
  lastWorkingDate: string;
  departmentName: string | null;
  employee: EmployeeRef;
  groups: ClearanceTeamGroup[];
  summary: { total: number; done: number };
};

export function getMyClearances(): Promise<MyClearanceCase[]> {
  return unwrap(jsonFetch<{ data: MyClearanceCase[] }>("/my-clearances"));
}

export function updateMyClearanceTask(
  caseId: number,
  taskId: number,
  body: { status?: ClearanceTaskStatus; remarks?: string | null },
): Promise<MyClearanceCase[]> {
  return unwrap(
    jsonFetch<{ data: MyClearanceCase[] }>(`/my-clearances/${caseId}/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

// ── Exit interview (Phase 3) ──

export type ExitQuestionType =
  | "yes_no"
  | "nps"
  | "star"
  | "rating_scale"
  | "single_choice"
  | "multiple_choice"
  | "comments"
  | "date";

export type ExitQuestion = {
  id: string;
  type: ExitQuestionType;
  label: string;
  required: boolean;
  options?: string[];
  scaleMax?: number;
};

export type ExitScopeRow = {
  scopeType: "Company" | "Branch" | "Department" | "SubDepartment";
  scopeId: number | null;
};

export type ExitInterviewTemplate = {
  id: number;
  name: string;
  description: string | null;
  questions: ExitQuestion[];
  isActive: boolean;
  isDefault: boolean;
  scope?: ExitScopeRow[];
  createdAt: string;
  updatedAt: string;
};

export type ExitInterviewResponse = {
  id: number;
  caseId: number;
  templateId: number | null;
  employeeId: number;
  status: "Pending" | "Completed";
  answers: Record<string, unknown>;
  submittedAt: string | null;
  template: {
    id: number;
    name: string;
    description: string | null;
    questions: ExitQuestion[];
  } | null;
};

export const EXIT_QUESTION_TYPE_LABEL: Record<ExitQuestionType, string> = {
  yes_no: "Yes / No",
  nps: "NPS (0–10)",
  star: "Star Rating",
  rating_scale: "Rating Scale",
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  comments: "Comments",
  date: "Date",
};

export type ExitTemplatePayload = {
  name: string;
  description?: string | null;
  questions: ExitQuestion[];
  isActive: boolean;
  isDefault: boolean;
  scope?: ExitScopeRow[];
};

export function listExitTemplates(): Promise<ExitInterviewTemplate[]> {
  return unwrap(jsonFetch<{ data: ExitInterviewTemplate[] }>("/exit-interview-templates"));
}

export function getExitTemplate(id: number): Promise<ExitInterviewTemplate> {
  return unwrap(jsonFetch<{ data: ExitInterviewTemplate }>(`/exit-interview-templates/${id}`));
}

export function createExitTemplate(body: ExitTemplatePayload): Promise<ExitInterviewTemplate> {
  return unwrap(
    jsonFetch<{ data: ExitInterviewTemplate }>("/exit-interview-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function updateExitTemplate(
  id: number,
  body: Partial<ExitTemplatePayload>,
): Promise<ExitInterviewTemplate> {
  return unwrap(
    jsonFetch<{ data: ExitInterviewTemplate }>(`/exit-interview-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export function deleteExitTemplate(id: number): Promise<ExitInterviewTemplate> {
  return unwrap(
    jsonFetch<{ data: ExitInterviewTemplate }>(`/exit-interview-templates/${id}`, {
      method: "DELETE",
    }),
  );
}

export function getMyExitInterview(): Promise<ExitInterviewResponse | null> {
  return unwrap(jsonFetch<{ data: ExitInterviewResponse | null }>("/me/exit-interview"));
}

export function submitMyExitInterview(
  id: number,
  answers: Record<string, unknown>,
): Promise<ExitInterviewResponse> {
  return unwrap(
    jsonFetch<{ data: ExitInterviewResponse }>(`/me/exit-interview/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  );
}

export function getCaseExitInterview(caseId: number): Promise<ExitInterviewResponse | null> {
  return unwrap(
    jsonFetch<{ data: ExitInterviewResponse | null }>(`/cases/${caseId}/exit-interview`),
  );
}

// ── Full & Final settlement (Phase 4) ──

export type FnfStatus = "Processing" | "Approved" | "Paid";
export type FnfLineKind = "Earning" | "Deduction";

export type FnfLineItem = {
  id: number;
  settlementId: number;
  kind: FnfLineKind;
  label: string;
  amount: string;
  sortOrder: number;
};

export type FnfSettlement = {
  id: number;
  caseId: number;
  employeeId: number;
  status: FnfStatus;
  notes: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type FnfTotals = {
  totalEarnings: number;
  totalDeductions: number;
  netAmount: number;
};

export type CaseFnf = {
  settlement: FnfSettlement;
  lines: FnfLineItem[];
  totals: FnfTotals;
};

export type FnfListItem = {
  settlement: FnfSettlement;
  caseNumber: string;
  caseId: number;
  lastWorkingDate: string;
  employee: EmployeeRef;
  totals: FnfTotals;
};

export function getCaseFnf(caseId: number): Promise<CaseFnf> {
  return unwrap(jsonFetch<{ data: CaseFnf }>(`/cases/${caseId}/fnf`));
}

export function addFnfLine(
  caseId: number,
  body: { kind: FnfLineKind; label: string; amount: number },
): Promise<CaseFnf> {
  return unwrap(
    jsonFetch<{ data: CaseFnf }>(`/cases/${caseId}/fnf/lines`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function updateFnfLine(
  caseId: number,
  lineId: number,
  body: { label?: string; amount?: number },
): Promise<CaseFnf> {
  return unwrap(
    jsonFetch<{ data: CaseFnf }>(`/cases/${caseId}/fnf/lines/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export function deleteFnfLine(caseId: number, lineId: number): Promise<CaseFnf> {
  return unwrap(
    jsonFetch<{ data: CaseFnf }>(`/cases/${caseId}/fnf/lines/${lineId}`, { method: "DELETE" }),
  );
}

export function approveFnf(caseId: number): Promise<CaseFnf> {
  return unwrap(jsonFetch<{ data: CaseFnf }>(`/cases/${caseId}/fnf/approve`, { method: "POST" }));
}

export function payFnf(caseId: number): Promise<CaseFnf> {
  return unwrap(jsonFetch<{ data: CaseFnf }>(`/cases/${caseId}/fnf/pay`, { method: "POST" }));
}

export function listFnf(): Promise<FnfListItem[]> {
  return unwrap(jsonFetch<{ data: FnfListItem[] }>("/fnf"));
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Exit documents (Phase 5) ──

export type ExitDocCategory = "HR" | "Finance" | "Employee";
export type ExitDocStatus = "Generated" | "Sent";

export type ExitDocumentTemplate = {
  id: number;
  name: string;
  category: ExitDocCategory;
  htmlTemplate: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExitDocument = {
  id: number;
  caseId: number;
  templateId: number | null;
  name: string;
  category: ExitDocCategory;
  renderedHtml: string;
  status: ExitDocStatus;
  generatedAt: string;
  sentAt: string | null;
};

export type CaseDocumentItem = {
  templateId: number;
  name: string;
  category: ExitDocCategory;
  sortOrder: number;
  document: { id: number; status: ExitDocStatus; generatedAt: string; sentAt: string | null } | null;
};

export const EXIT_DOC_VARIABLES = [
  "companyName",
  "employeeName",
  "empId",
  "designation",
  "department",
  "dateOfJoining",
  "resignationDate",
  "lastWorkingDate",
  "noticePeriodDays",
  "caseNumber",
  "currentDate",
  "netSettlement",
] as const;

export const EXIT_DOC_CATEGORY_LABEL: Record<ExitDocCategory, string> = {
  HR: "HR Documents",
  Finance: "Finance Documents",
  Employee: "Employee Documents",
};

export type DocTemplatePayload = {
  name: string;
  category: ExitDocCategory;
  htmlTemplate: string;
  isActive: boolean;
  sortOrder: number;
};

export function listDocumentTemplates(): Promise<ExitDocumentTemplate[]> {
  return unwrap(jsonFetch<{ data: ExitDocumentTemplate[] }>("/document-templates"));
}

export function createDocumentTemplate(body: DocTemplatePayload): Promise<ExitDocumentTemplate> {
  return unwrap(
    jsonFetch<{ data: ExitDocumentTemplate }>("/document-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export function updateDocumentTemplate(
  id: number,
  body: Partial<DocTemplatePayload>,
): Promise<ExitDocumentTemplate> {
  return unwrap(
    jsonFetch<{ data: ExitDocumentTemplate }>(`/document-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export function deleteDocumentTemplate(id: number): Promise<ExitDocumentTemplate> {
  return unwrap(
    jsonFetch<{ data: ExitDocumentTemplate }>(`/document-templates/${id}`, { method: "DELETE" }),
  );
}

export function getCaseDocuments(caseId: number): Promise<CaseDocumentItem[]> {
  return unwrap(jsonFetch<{ data: CaseDocumentItem[] }>(`/cases/${caseId}/documents`));
}

export function generateDocument(caseId: number, templateId: number): Promise<ExitDocument> {
  return unwrap(
    jsonFetch<{ data: ExitDocument }>(`/cases/${caseId}/documents/${templateId}/generate`, {
      method: "POST",
    }),
  );
}

export function getDocument(caseId: number, docId: number): Promise<ExitDocument> {
  return unwrap(jsonFetch<{ data: ExitDocument }>(`/cases/${caseId}/documents/${docId}`));
}

export function sendDocument(caseId: number, docId: number): Promise<ExitDocument> {
  return unwrap(
    jsonFetch<{ data: ExitDocument }>(`/cases/${caseId}/documents/${docId}/send`, { method: "POST" }),
  );
}

// ── Access revocation + final closure (Phase 6) ──

export type AccessSystem =
  | "HRMSLogin"
  | "Email"
  | "VPN"
  | "CRM"
  | "ERP"
  | "AttendanceSystem"
  | "BankingApplication";

export type AccessItem = {
  id: number;
  system: AccessSystem;
  status: "Active" | "Disabled";
  isAuto: boolean;
  revokedAt: string | null;
};

export const ACCESS_SYSTEM_LABEL: Record<AccessSystem, string> = {
  HRMSLogin: "HRMS Login",
  Email: "Email Account",
  VPN: "VPN",
  CRM: "CRM",
  ERP: "ERP",
  AttendanceSystem: "Attendance System",
  BankingApplication: "Banking Application",
};

export type CaseClosure = {
  caseId: number;
  status: OffboardingCase["status"];
  checklist: {
    clearances: { complete: boolean; teams: { team: string; status: string }[] };
    exitInterview: { completed: boolean; status: string };
    fnf: { paid: boolean; status: string };
    documents: { total: number; generated: number; sent: number };
    access: { allRevoked: boolean; total: number; revoked: number };
  };
  ready: boolean;
};

export function getCaseAccess(caseId: number): Promise<AccessItem[]> {
  return unwrap(jsonFetch<{ data: AccessItem[] }>(`/cases/${caseId}/access`));
}

export function revokeAccess(caseId: number, accessId: number): Promise<AccessItem[]> {
  return unwrap(
    jsonFetch<{ data: AccessItem[] }>(`/cases/${caseId}/access/${accessId}/revoke`, { method: "POST" }),
  );
}

export function revokeAllAccess(caseId: number): Promise<AccessItem[]> {
  return unwrap(
    jsonFetch<{ data: AccessItem[] }>(`/cases/${caseId}/access/revoke-all`, { method: "POST" }),
  );
}

export function getCaseClosure(caseId: number): Promise<CaseClosure> {
  return unwrap(jsonFetch<{ data: CaseClosure }>(`/cases/${caseId}/closure`));
}

export function closeCase(caseId: number): Promise<CaseClosure> {
  return unwrap(jsonFetch<{ data: CaseClosure }>(`/cases/${caseId}/close`, { method: "POST" }));
}

// Open a preview popup for a rendered document. The user can print manually
// (Ctrl+P / Cmd+P) from within the popup if needed.
export function printDocumentHtml(title: string, renderedHtml: string): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "width=860,height=920");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <meta charset="utf-8" />
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.6; }
      h2 { font-size: 20px; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; }
      p { margin: 12px 0; }
      #print-bar { position: fixed; top: 0; left: 0; right: 0; background: #1e40af; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; font-family: system-ui, sans-serif; font-size: 14px; z-index: 999; }
      #print-bar button { background: #fff; color: #1e40af; border: none; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
      @media print { #print-bar { display: none; } body { margin: 24px; } }
    </style></head><body>
    <div id="print-bar">
      <span>${title}</span>
      <button onclick="window.print()">Print / Save PDF</button>
    </div>
    <div style="margin-top:56px">${renderedHtml}</div>
    </body></html>`);
  w.document.close();
}
