import { API_BASE } from "@/lib/hrms-client";

export type RoleListItem = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type RoleDetail = RoleListItem;

export type CreateRolePayload = {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateRolePayload = CreateRolePayload;

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class RoleApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "RoleApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseApiError(res: Response): Promise<RoleApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const code = body.error?.code ?? "UNKNOWN";
  const message = body.error?.message ?? res.statusText ?? "Request failed.";
  return new RoleApiError(res.status, code, message, body.error?.details);
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

type RawRoleRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

function toListItem(row: RawRoleRow): RoleListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
  };
}

type ListResponse = {
  data: RawRoleRow[];
};

export async function fetchRoles(): Promise<RoleListItem[]> {
  const res = await jsonFetch<ListResponse>("/roles?limit=500");
  return res.data.map(toListItem);
}

export async function fetchRoleById(id: number): Promise<RoleDetail> {
  const res = await jsonFetch<{ data: RawRoleRow }>(`/roles/${id}`);
  return toListItem(res.data);
}

export async function createRole(payload: CreateRolePayload): Promise<RoleListItem> {
  const res = await jsonFetch<{ data: RawRoleRow }>("/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

export async function updateRole(
  id: number,
  payload: UpdateRolePayload,
): Promise<RoleDetail> {
  const res = await jsonFetch<{ data: RawRoleRow }>(`/roles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

export async function fetchRolePermissionIds(roleId: number): Promise<number[]> {
  const res = await jsonFetch<{ data: { permissionIds: number[] } }>(
    `/roles/${roleId}/permissions`,
  );
  return res.data.permissionIds;
}

export async function setRolePermissions(
  roleId: number,
  permissionIds: number[],
): Promise<number[]> {
  const res = await jsonFetch<{ data: { permissionIds: number[] } }>(
    `/roles/${roleId}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ permissionIds }),
    },
  );
  return res.data.permissionIds;
}

export async function fetchRolePermissionMap(): Promise<Record<number, number[]>> {
  const res = await jsonFetch<{ data: Record<number, number[]> }>(
    "/roles/permission-map",
  );
  return res.data;
}
