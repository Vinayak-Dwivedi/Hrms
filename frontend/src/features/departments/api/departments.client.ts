import { API_BASE } from "@/lib/hrms-client";

export type DepartmentListItem = {
  id: number;
  name: string;
  managerId: number | null;
  locationArea: string | null;
  headcount: number;
  createdAt: string;
  updatedAt: string;
};

export type DepartmentDetail = DepartmentListItem;

export type CreateDepartmentPayload = {
  name: string;
  managerId?: number | null;
  locationArea?: string | null;
  headcount?: number;
};

export type UpdateDepartmentPayload = CreateDepartmentPayload;

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class DepartmentApiError extends Error {
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
    this.name = "DepartmentApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseApiError(res: Response): Promise<DepartmentApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const code = body.error?.code ?? "UNKNOWN";
  const message = body.error?.message ?? res.statusText ?? "Request failed.";
  return new DepartmentApiError(res.status, code, message, body.error?.details);
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

type RawDepartmentRow = {
  id: number;
  name: string;
  managerId: number | null;
  locationArea: string | null;
  headcount: number;
  createdAt: string;
  updatedAt: string;
};

function toListItem(row: RawDepartmentRow): DepartmentListItem {
  return {
    id: row.id,
    name: row.name,
    managerId: row.managerId,
    locationArea: row.locationArea,
    headcount: row.headcount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type ListResponse = {
  data: RawDepartmentRow[];
};

export async function fetchDepartmentsList(): Promise<DepartmentListItem[]> {
  const res = await jsonFetch<ListResponse>("/departments?limit=500");
  return res.data.map(toListItem);
}

export async function fetchDepartmentById(
  id: number,
): Promise<DepartmentDetail> {
  const res = await jsonFetch<{ data: RawDepartmentRow }>(`/departments/${id}`);
  return toListItem(res.data);
}

export async function createDepartment(
  payload: CreateDepartmentPayload,
): Promise<DepartmentListItem> {
  const res = await jsonFetch<{ data: RawDepartmentRow }>("/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

export async function updateDepartment(
  id: number,
  payload: UpdateDepartmentPayload,
): Promise<DepartmentDetail> {
  const res = await jsonFetch<{ data: RawDepartmentRow }>(`/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}
