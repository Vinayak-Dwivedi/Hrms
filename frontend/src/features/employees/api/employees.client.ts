import { API_BASE } from "@/lib/hrms-client";
import type { MaritalStatus } from "@/features/onboarding/constants/personal";
import {
  toProfilePayload,
  type EmployeeProfile,
} from "@/features/onboarding/api/onboarding.client";
import type {
  OnboardingBankFormValues,
  OnboardingProfileValues,
} from "@/features/onboarding/schemas/onboarding.schema";

export type EmployeeStatus =
  | "Active"
  | "Inactive"
  | "Probation"
  | "Notice"
  | "Exited";

export type OnboardingPipelineStatus =
  | "PENDING"
  | "INVITATION_SENT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "EXPIRED";

export type EmployeeListItem = {
  id: number;
  empId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  workEmail: string | null;
  phone: string;
  departmentId: number | null;
  subDepartmentId: number | null;
  designationId: number | null;
  orgHierarchyStructureId?: number | null;
  locationId?: number | null;
  branchId?: number | null;
  employeeStatus: EmployeeStatus;
  joiningDate: string;
  onboardingStatus?: OnboardingPipelineStatus;
};

export type EmployeeDetail = EmployeeListItem & {
  personalEmail: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  nationality: string;
  maritalStatus: MaritalStatus | null;
  spouseName: string | null;
  gradeId: number | null;
  branchId: number | null;
  locationId?: number | null;
  reportingManagerId: number | null;
  orgHierarchyStructureId?: number | null;
  roleId: number | null;
  roleName: string | null;
  onboardingTokenExpiry?: string | null;
  onboardingTokenUsed?: boolean;
  onboardingCompletedAt?: string | null;
  onboardingSubmittedAt?: string | null;
  profile?: EmployeeProfile;
};

export type LookupItem = {
  id: number;
  name: string;
};

export type ManagerOption = {
  id: number;
  label: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export function toSelectOptions(items: LookupItem[]): SelectOption[] {
  return items
    .filter(
      (item) =>
        Number.isFinite(item.id) &&
        item.id > 0 &&
        typeof item.name === "string" &&
        item.name.trim().length > 0,
    )
    .map((item) => ({
      value: String(item.id),
      label: item.name.trim(),
    }));
}

export function toManagerSelectOptions(
  managers: ManagerOption[],
): SelectOption[] {
  return managers
    .filter(
      (manager) =>
        Number.isFinite(manager.id) &&
        manager.id > 0 &&
        typeof manager.label === "string" &&
        manager.label.trim().length > 0,
    )
    .map((manager) => ({
      value: String(manager.id),
      label: manager.label.trim(),
    }));
}

export type CreateEmployeePayload = {
  empId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  personalEmail: string;
  workEmail: string;
  phone: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  joiningDate: string;
  password?: string;
  roleId: number;
  orgHierarchyStructureId?: number;
  locationId?: number;
  branchId?: number;
  reportingManagerId?: number;
  maritalStatus?: MaritalStatus | null;
  spouseName?: string | null;
};

export type UpdateEmployeePayload = {
  empId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  personalEmail: string;
  workEmail: string;
  phone: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  joiningDate: string;
  employeeStatus: EmployeeStatus;
  orgHierarchyStructureId?: number | null;
  locationId?: number | null;
  branchId?: number | null;
  reportingManagerId?: number | null;
  reportingChain?: number[];
  maritalStatus?: MaritalStatus | null;
  spouseName?: string | null;
  password?: string;
  roleId?: number;
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class EmployeeApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "EmployeeApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseApiError(res: Response): Promise<EmployeeApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const code = body.error?.code ?? "UNKNOWN";
  let message = body.error?.message ?? res.statusText ?? "Request failed.";
  const details = body.error?.details;
  if (
    details &&
    typeof details === "object" &&
    details !== null &&
    "message" in details &&
    typeof (details as { message?: unknown }).message === "string"
  ) {
    message = (details as { message: string }).message;
  }
  return new EmployeeApiError(res.status, code, message, details);
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw await parseApiError(res);
  }
  return (await res.json()) as T;
}

type RawEmployeeRow = {
  id: number;
  empId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  personalEmail: string;
  workEmail: string | null;
  phone: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  nationality: string;
  maritalStatus: MaritalStatus | null;
  spouseName: string | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  designationId: number | null;
  gradeId: number | null;
  branchId: number | null;
  locationId?: number | null;
  reportingManagerId: number | null;
  orgHierarchyStructureId?: number | null;
  employeeStatus: EmployeeStatus;
  joiningDate: string;
  passwordHash?: string;
  onboardingTokenExpiry?: string | null;
  onboardingTokenUsed?: boolean;
  onboardingCompletedAt?: string | null;
  onboardingStatus?: OnboardingPipelineStatus;
  onboardingSubmittedAt?: string | null;
  roleId?: number | null;
  roleName?: string | null;
  profile?: EmployeeProfile;
};

function toDetail(row: RawEmployeeRow): EmployeeDetail {
  return {
    id: row.id,
    empId: row.empId,
    firstName: row.firstName,
    middleName: row.middleName ?? null,
    lastName: row.lastName,
    personalEmail: row.personalEmail,
    workEmail: row.workEmail,
    phone: row.phone,
    dob: row.dob,
    gender: row.gender,
    nationality: row.nationality,
    maritalStatus: row.maritalStatus,
    spouseName: row.spouseName,
    departmentId: row.departmentId,
    subDepartmentId: row.subDepartmentId,
    designationId: row.designationId,
    gradeId: row.gradeId,
    branchId: row.branchId,
    locationId: row.locationId ?? row.branchId,
    reportingManagerId: row.reportingManagerId,
    orgHierarchyStructureId: row.orgHierarchyStructureId ?? null,
    employeeStatus: row.employeeStatus,
    joiningDate: row.joiningDate,
    onboardingTokenExpiry: row.onboardingTokenExpiry ?? null,
    onboardingTokenUsed: row.onboardingTokenUsed ?? false,
    onboardingCompletedAt: row.onboardingCompletedAt ?? null,
    onboardingStatus: row.onboardingStatus,
    onboardingSubmittedAt: row.onboardingSubmittedAt ?? null,
    roleId: row.roleId ?? null,
    roleName: row.roleName ?? null,
    profile: row.profile,
  };
}

function toListItem(row: RawEmployeeRow): EmployeeListItem {
  return {
    id: row.id,
    empId: row.empId,
    firstName: row.firstName,
    middleName: row.middleName ?? null,
    lastName: row.lastName,
    workEmail: row.workEmail,
    phone: row.phone,
    departmentId: row.departmentId,
    subDepartmentId: row.subDepartmentId,
    designationId: row.designationId,
    orgHierarchyStructureId: row.orgHierarchyStructureId ?? null,
    locationId: row.locationId ?? row.branchId ?? null,
    branchId: row.branchId ?? null,
    employeeStatus: row.employeeStatus,
    joiningDate: row.joiningDate,
    onboardingStatus: row.onboardingStatus,
  };
}

type ListResponse = {
  data: RawEmployeeRow[];
  limit: number;
  offset: number;
  count?: number;
  total?: number;
};

type LookupRow = { id: number; name: string };
type GradeRow = { id: number; code: string; bandName: string };
type CrudListResponse = { data: LookupRow[] };
type GradeListResponse = { data: GradeRow[] };

export type EmployeeListFilters = {
  search?: string;
  departmentId?: number;
  employeeStatus?: EmployeeStatus;
  onboardingStatus?: OnboardingPipelineStatus;
  limit?: number;
  offset?: number;
  sort?: "id" | "createdAt" | "joiningDate" | "lastName";
};

export type EmployeeListResult = {
  employees: EmployeeListItem[];
  total: number;
};

export async function fetchEmployeeList(
  filters: EmployeeListFilters = {},
): Promise<EmployeeListResult> {
  const params = new URLSearchParams();
  params.set("sort", filters.sort ?? "id");
  params.set("limit", String(filters.limit ?? 500));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.departmentId != null) {
    params.set("departmentId", String(filters.departmentId));
  }
  if (filters.employeeStatus) {
    params.set("employeeStatus", filters.employeeStatus);
  }
  if (filters.onboardingStatus) {
    params.set("onboardingStatus", filters.onboardingStatus);
  }
  const res = await jsonFetch<ListResponse>(`/employees?${params}`);
  return {
    employees: res.data.map(toListItem),
    total: res.total ?? res.data.length,
  };
}

export async function fetchEmployees(
  filters: EmployeeListFilters = {},
): Promise<EmployeeListItem[]> {
  return (await fetchEmployeeList(filters)).employees;
}

const ONBOARDING_STATUS_LABEL: Record<OnboardingPipelineStatus, string> = {
  PENDING: "Pending",
  INVITATION_SENT: "Invitation sent",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
};

export function formatOnboardingStatus(
  status?: OnboardingPipelineStatus,
): string {
  if (!status) return "—";
  return ONBOARDING_STATUS_LABEL[status] ?? status;
}

export async function createEmployee(
  payload: CreateEmployeePayload,
): Promise<EmployeeListItem> {
  const res = await jsonFetch<{ data: RawEmployeeRow }>("/employees/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

export type BulkUploadRowError = { row: number; error: string };

export type BulkUploadResult = {
  inserted: number;
  errors: BulkUploadRowError[];
};

export async function uploadEmployeesBulk(file: File): Promise<BulkUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(buildUrl("/employees/upload-bulk"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = (await res.json().catch(() => ({}))) as {
    inserted?: number;
    errors?: BulkUploadRowError[];
    error?: { message?: string; details?: BulkUploadRowError[] };
  };

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new EmployeeApiError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  if (res.status === 201) {
    return {
      inserted: body.inserted ?? 0,
      errors: body.errors ?? [],
    };
  }

  if (res.status === 422) {
    return {
      inserted: body.inserted ?? 0,
      errors: body.errors ?? body.error?.details ?? [],
    };
  }

  throw new EmployeeApiError(
    res.status,
    "UPLOAD_FAILED",
    body.error?.message ?? "Bulk upload failed.",
    body.error?.details,
  );
}

export const EMPLOYEE_BULK_TEMPLATE_HEADERS = [
  "Emp ID",
  "First Name",
  "Middle Name",
  "Last Name",
  "Personal Email",
  "Work Email",
  "Phone",
  "DOB",
  "Gender",
  "Joining Date",
  "Password",
  "Role",
  "Department",
  "Designation",
] as const;

export function downloadEmployeeBulkTemplate(): void {
  const sampleRow = [
    "ILD-3001",
    "Aarav",
    "",
    "Singh",
    "aarav.personal@example.com",
    "aarav@ileads.com",
    "9999900001",
    "1995-06-15",
    "Male",
    "2024-01-10",
    "Password123",
    "Employee",
    "",
    "",
  ];
  const csv = [EMPLOYEE_BULK_TEMPLATE_HEADERS.join(","), sampleRow.join(",")].join(
    "\n",
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employee-bulk-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchEmployeeById(id: number): Promise<EmployeeDetail> {
  const res = await jsonFetch<{ data: RawEmployeeRow & { profile?: unknown } }>(
    `/employees/${id}`,
  );
  return toDetail(res.data);
}

export async function updateEmployee(
  id: number,
  payload: UpdateEmployeePayload,
): Promise<EmployeeDetail> {
  const res = await jsonFetch<{ data: RawEmployeeRow }>(`/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return toDetail(res.data);
}

function toHrProfilePayload(
  values: OnboardingProfileValues,
  bank?: OnboardingBankFormValues | null,
) {
  const payload = toProfilePayload(values) as ReturnType<typeof toProfilePayload> & {
    bank?: Array<{
      id?: number;
      accountNumber: string;
      accountName: string;
      bankName: string;
      branchName: string;
      ifscCode: string;
      isPrimary?: boolean;
    }>;
  };
  if (bank?.bank?.length) {
    payload.bank = bank.bank.map((row) => ({
      id: row.id,
      accountNumber: row.accountNumber,
      accountName: row.accountName,
      bankName: row.bankName,
      branchName: row.branchName,
      ifscCode: row.ifscCode,
      isPrimary: row.isPrimary ?? false,
    }));
  }
  return payload;
}

export async function updateEmployeeProfileByHr(
  id: number,
  values: OnboardingProfileValues,
  bank?: OnboardingBankFormValues | null,
): Promise<EmployeeProfile> {
  return jsonFetch<EmployeeProfile>(`/employees/${id}/profile`, {
    method: "PATCH",
    body: JSON.stringify(toHrProfilePayload(values, bank)),
  });
}

async function fetchLookup(path: string): Promise<LookupItem[]> {
  const res = await jsonFetch<CrudListResponse>(`${path}?limit=500`);
  return res.data
    .filter(
      (row) =>
        row.id != null &&
        row.name != null &&
        String(row.name).trim().length > 0,
    )
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name).trim(),
    }))
    .filter((row) => Number.isFinite(row.id) && row.id > 0);
}

export function fetchDepartments(): Promise<LookupItem[]> {
  return fetchLookup("/departments");
}

export function fetchSubDepartments(): Promise<LookupItem[]> {
  return fetchLookup("/sub-departments");
}

export function fetchDesignations(): Promise<LookupItem[]> {
  return fetchLookup("/designations");
}

export function fetchBranches(): Promise<LookupItem[]> {
  return fetchLookup("/branches");
}

export function fetchGrades(): Promise<LookupItem[]> {
  return jsonFetch<GradeListResponse>("/grades?limit=500").then((res) =>
    res.data.map((row) => ({
      id: row.id,
      name: `${row.code} — ${row.bandName}`,
    })),
  );
}

export async function fetchRoleOptions(): Promise<LookupItem[]> {
  const res = await jsonFetch<{ data: LookupItem[] }>("/employees/role-options");
  return res.data;
}

export async function fetchManagerOptions(): Promise<ManagerOption[]> {
  const employees = await fetchEmployees();
  return employees.map((e) => ({
    id: e.id,
    label: `${e.firstName} ${e.lastName} (${e.empId})`,
  }));
}

export function formatEmployeeDisplayName(employee: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [employee.firstName, employee.middleName, employee.lastName]
    .filter((part) => part?.trim())
    .join(" ");
}

export function lookupName(
  id: number | null | undefined,
  items: LookupItem[],
): string {
  if (id == null) return "—";
  return items.find((item) => item.id === id)?.name ?? "—";
}

export function resolveSystemAccessRoleLabel(
  employee: Pick<EmployeeDetail, "roleId" | "roleName">,
  roleOptions: LookupItem[],
): string {
  if (employee.roleName?.trim()) {
    return employee.roleName.trim();
  }
  if (employee.roleId != null) {
    const name = lookupName(employee.roleId, roleOptions);
    if (name !== "—") {
      return name;
    }
  }
  return "—";
}

export async function resendOnboardingInvitation(
  id: number,
): Promise<{ message: string; expiresAt: string }> {
  return jsonFetch<{ message: string; expiresAt: string }>(
    `/employees/${id}/resend-invitation`,
    { method: "POST" },
  );
}

export function isOnboardingCompleted(employee: {
  onboardingStatus?: OnboardingPipelineStatus;
  onboardingCompletedAt?: string | null;
}): boolean {
  return (
    employee.onboardingStatus === "COMPLETED" ||
    Boolean(employee.onboardingCompletedAt)
  );
}

export function getOnboardingInvitationStatus(employee: EmployeeDetail): {
  label: string;
  tone: "green" | "amber" | "gray" | "blue";
} {
  const status = employee.onboardingStatus;
  if (isOnboardingCompleted(employee)) {
    return { label: "Onboarding completed", tone: "green" };
  }
  if (status === "EXPIRED") {
    return { label: "Invitation expired", tone: "amber" };
  }
  if (status === "IN_PROGRESS") {
    return employee.onboardingSubmittedAt
      ? { label: "Submitted — awaiting HR review", tone: "blue" }
      : { label: "Onboarding in progress", tone: "blue" };
  }
  if (status === "INVITATION_SENT") {
    return { label: "Invitation sent", tone: "gray" };
  }
  if (status === "PENDING") {
    return { label: "Pending invitation", tone: "gray" };
  }
  if (employee.onboardingTokenUsed) {
    return { label: "Invitation used", tone: "blue" };
  }
  return { label: "No invitation sent", tone: "gray" };
}
