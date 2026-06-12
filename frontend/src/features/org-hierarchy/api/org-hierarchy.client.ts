import { API_BASE } from "@/lib/hrms-client";

export type OrgHierarchyStatus = "Active" | "Inactive";

export type OrgDepartment = {
  id: number;
  companyId: number | null;
  name: string;
  code: string;
  status: OrgHierarchyStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrgSubDepartment = {
  id: number;
  departmentId: number;
  companyId: number | null;
  name: string;
  status: OrgHierarchyStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrgLevel = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type OrgDesignation = {
  id: number;
  name: string;
  code: string | null;
  levelId: number;
  status: OrgHierarchyStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrgStructure = {
  id: number;
  departmentId: number;
  subDepartmentId: number;
  designationId: number;
  levelId: number;
  companyId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type HierarchyTreeRole = {
  structureId: number;
  designationId: number;
  designation: string;
  levelId: number;
  level: string;
};

export type HierarchyTreeSubDepartment = {
  id: number;
  name: string;
  roles: HierarchyTreeRole[];
};

export type HierarchyTreeDepartment = {
  id: number;
  name: string;
  code: string;
  subDepartments: HierarchyTreeSubDepartment[];
};

type ApiErrorBody = {
  error?: { code?: string; message?: string; details?: unknown };
};

export class OrgHierarchyApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "OrgHierarchyApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseApiError(res: Response): Promise<OrgHierarchyApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const code = body.error?.code ?? "UNKNOWN";
  let message = body.error?.message ?? res.statusText ?? "Request failed.";
  if (code === "INTERNAL_ERROR" && message === "An unexpected error occurred.") {
    message =
      "The org hierarchy API failed. Ensure the API server is running and run: npm run db:migrate-org-hierarchy";
  }
  return new OrgHierarchyApiError(res.status, code, message, body.error?.details);
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
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type ListResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T };

const BASE = "/org-hierarchy";

export async function fetchHierarchyTree(): Promise<HierarchyTreeDepartment[]> {
  const res = await jsonFetch<ListResponse<HierarchyTreeDepartment>>(
    `${BASE}/tree`,
  );
  return res.data;
}

export async function fetchOrgDepartments(
  status?: OrgHierarchyStatus,
): Promise<OrgDepartment[]> {
  const q = status ? `?status=${status}&limit=500` : "?limit=500";
  const res = await jsonFetch<ListResponse<OrgDepartment>>(
    `${BASE}/departments${q}`,
  );
  return res.data;
}

export async function createOrgDepartment(payload: {
  name: string;
  code: string;
  status?: OrgHierarchyStatus;
}): Promise<OrgDepartment> {
  const res = await jsonFetch<ItemResponse<OrgDepartment>>(
    `${BASE}/departments`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function updateOrgDepartment(
  id: number,
  payload: Partial<{ name: string; code: string; status: OrgHierarchyStatus }>,
): Promise<OrgDepartment> {
  const res = await jsonFetch<ItemResponse<OrgDepartment>>(
    `${BASE}/departments/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function deleteOrgDepartment(id: number): Promise<void> {
  await jsonFetch<void>(`${BASE}/departments/${id}`, { method: "DELETE" });
}

export async function fetchOrgSubDepartments(
  departmentId?: number,
): Promise<OrgSubDepartment[]> {
  const params = new URLSearchParams({ limit: "500" });
  if (departmentId) params.set("departmentId", String(departmentId));
  const res = await jsonFetch<ListResponse<OrgSubDepartment>>(
    `${BASE}/sub-departments?${params}`,
  );
  return res.data;
}

export async function createOrgSubDepartment(payload: {
  departmentId: number;
  name: string;
  status?: OrgHierarchyStatus;
}): Promise<OrgSubDepartment> {
  const res = await jsonFetch<ItemResponse<OrgSubDepartment>>(
    `${BASE}/sub-departments`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function updateOrgSubDepartment(
  id: number,
  payload: Partial<{
    departmentId: number;
    name: string;
    status: OrgHierarchyStatus;
  }>,
): Promise<OrgSubDepartment> {
  const res = await jsonFetch<ItemResponse<OrgSubDepartment>>(
    `${BASE}/sub-departments/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function deleteOrgSubDepartment(id: number): Promise<void> {
  await jsonFetch<void>(`${BASE}/sub-departments/${id}`, { method: "DELETE" });
}

export async function fetchOrgLevels(): Promise<OrgLevel[]> {
  const res = await jsonFetch<ListResponse<OrgLevel>>(`${BASE}/levels?limit=500`);
  return res.data;
}

export async function createOrgLevel(payload: {
  code: string;
  name: string;
  sortOrder?: number;
}): Promise<OrgLevel> {
  const res = await jsonFetch<ItemResponse<OrgLevel>>(`${BASE}/levels`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateOrgLevel(
  id: number,
  payload: Partial<{ code: string; name: string; sortOrder: number }>,
): Promise<OrgLevel> {
  const res = await jsonFetch<ItemResponse<OrgLevel>>(`${BASE}/levels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteOrgLevel(id: number): Promise<void> {
  await jsonFetch<void>(`${BASE}/levels/${id}`, { method: "DELETE" });
}

export async function fetchOrgDesignations(
  levelId?: number,
): Promise<OrgDesignation[]> {
  const params = new URLSearchParams({ limit: "500" });
  if (levelId) params.set("levelId", String(levelId));
  const res = await jsonFetch<ListResponse<OrgDesignation>>(
    `${BASE}/designations?${params}`,
  );
  return res.data;
}

export async function createOrgDesignation(payload: {
  name: string;
  code?: string;
  levelId: number;
  status?: OrgHierarchyStatus;
}): Promise<OrgDesignation> {
  const res = await jsonFetch<ItemResponse<OrgDesignation>>(
    `${BASE}/designations`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function updateOrgDesignation(
  id: number,
  payload: Partial<{
    name: string;
    code: string;
    levelId: number;
    status: OrgHierarchyStatus;
  }>,
): Promise<OrgDesignation> {
  const res = await jsonFetch<ItemResponse<OrgDesignation>>(
    `${BASE}/designations/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function deleteOrgDesignation(id: number): Promise<void> {
  await jsonFetch<void>(`${BASE}/designations/${id}`, { method: "DELETE" });
}

export async function fetchOrgStructure(
  departmentId?: number,
): Promise<OrgStructure[]> {
  const params = new URLSearchParams({ limit: "500" });
  if (departmentId) params.set("departmentId", String(departmentId));
  const res = await jsonFetch<ListResponse<OrgStructure>>(
    `${BASE}/structure?${params}`,
  );
  return res.data;
}

export async function createOrgStructure(payload: {
  departmentId: number;
  subDepartmentId: number;
  designationId: number;
}): Promise<OrgStructure> {
  const res = await jsonFetch<ItemResponse<OrgStructure>>(
    `${BASE}/structure`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function updateOrgStructure(
  id: number,
  payload: Partial<{
    departmentId: number;
    subDepartmentId: number;
    designationId: number;
  }>,
): Promise<OrgStructure> {
  const res = await jsonFetch<ItemResponse<OrgStructure>>(
    `${BASE}/structure/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function deleteOrgStructure(id: number): Promise<void> {
  await jsonFetch<void>(`${BASE}/structure/${id}`, { method: "DELETE" });
}
