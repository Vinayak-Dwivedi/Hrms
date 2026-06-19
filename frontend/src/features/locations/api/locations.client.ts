import { API_BASE } from "@/lib/hrms-client";

export type LocationListItem = {
  id: number;
  name: string;
  address: string | null;
  headcount: number;
  createdAt: string;
  updatedAt: string;
};

export type LocationDetail = LocationListItem;

export type CreateLocationPayload = {
  name: string;
  address?: string | null;
  headcount?: number;
};

export type UpdateLocationPayload = CreateLocationPayload;

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class LocationApiError extends Error {
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
    this.name = "LocationApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseApiError(res: Response): Promise<LocationApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const code = body.error?.code ?? "UNKNOWN";
  const message = body.error?.message ?? res.statusText ?? "Request failed.";
  return new LocationApiError(res.status, code, message, body.error?.details);
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

type RawBranchRow = {
  id: number;
  name: string;
  address: string | null;
  headcount: number;
  createdAt: string;
  updatedAt: string;
};

function toListItem(row: RawBranchRow): LocationListItem {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    headcount: row.headcount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type ListResponse = {
  data: RawBranchRow[];
};

export async function fetchLocationsList(): Promise<LocationListItem[]> {
  const res = await jsonFetch<ListResponse>("/branches?limit=500");
  return res.data.map(toListItem);
}

export async function fetchLocationById(id: number): Promise<LocationDetail> {
  const res = await jsonFetch<{ data: RawBranchRow }>(`/branches/${id}`);
  return toListItem(res.data);
}

export async function createLocation(
  payload: CreateLocationPayload,
): Promise<LocationListItem> {
  const res = await jsonFetch<{ data: RawBranchRow }>("/branches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

export async function updateLocation(
  id: number,
  payload: UpdateLocationPayload,
): Promise<LocationDetail> {
  const res = await jsonFetch<{ data: RawBranchRow }>(`/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return toListItem(res.data);
}

/** Permanently delete a location. Throws (409 IN_USE) if it still has linked
 *  records (departments, sub-departments or employees). */
export async function deleteLocation(id: number): Promise<void> {
  await jsonFetch<{ deleted: true }>(`/branches/${id}`, { method: "DELETE" });
}
