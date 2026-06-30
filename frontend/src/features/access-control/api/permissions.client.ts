import { API_BASE } from "@/lib/hrms-client";

export type PermissionListItem = {
  id: number;
  code: string;
  name: string;
  module: string;
  description: string | null;
  isActive: boolean;
};

export type PermissionDetail = PermissionListItem;

export type CreatePermissionPayload = {
  code: string;
  name: string;
  module: string;
  description?: string | null;
  isActive?: boolean;
};

export type UpdatePermissionPayload = CreatePermissionPayload;

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class PermissionApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "PermissionApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseApiError(res: Response): Promise<PermissionApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const code = body.error?.code ?? "UNKNOWN";
  const message = body.error?.message ?? res.statusText ?? "Request failed.";
  return new PermissionApiError(res.status, code, message, body.error?.details);
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

type RawPermissionRow = {
  id: number;
  code: string;
  name: string;
  module: string;
  description: string | null;
  isActive: boolean;
};

function toListItem(row: RawPermissionRow): PermissionListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    module: row.module,
    description: row.description,
    isActive: row.isActive,
  };
}

type ListResponse = {
  data: RawPermissionRow[];
};

export async function fetchPermissions(): Promise<PermissionListItem[]> {
  const res = await jsonFetch<ListResponse>("/permissions?limit=500");
  return res.data.map(toListItem);
}

export async function fetchPermissionById(id: number): Promise<PermissionDetail> {
  const res = await jsonFetch<{ data: RawPermissionRow }>(`/permissions/${id}`);
  return toListItem(res.data);
}

export async function createPermission(
  payload: CreatePermissionPayload,
): Promise<PermissionListItem> {
  const res = await jsonFetch<{ data: RawPermissionRow }>("/permissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

export async function updatePermission(
  id: number,
  payload: UpdatePermissionPayload,
): Promise<PermissionDetail> {
  const res = await jsonFetch<{ data: RawPermissionRow }>(`/permissions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

export async function deletePermission(id: number): Promise<void> {
  await jsonFetch(`/permissions/${id}`, { method: "DELETE" });
}

export const PERMISSION_MODULES = [
  "admin",
  "approvals",
  "attendance",
  "clearances",
  "dashboard",
  "employees",
  "leave",
  "offboarding",
  "onboarding",
  "payroll",
  "reports",
  "settings",
  "shifts",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
