import { API_BASE } from "@/lib/hrms-client";

function buildUrl(path: string): string {
  return `${API_BASE}/api/hrms${path.startsWith("/") ? path : `/${path}`}`;
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
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

export type OnboardingDocument = {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType?: string;
  status: string;
  verifiedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
};

export type FetchedOnboardingDocument = {
  blob: Blob;
  mimeType: string;
  filename: string;
};

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain?.[1] ?? null;
}

export type OnboardingTimeline = {
  onboardingStatus: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  documents: OnboardingDocument[];
  tokenHistory: Array<{
    id: string;
    expiresAt: string;
    usedAt: string | null;
    invalidatedAt: string | null;
    issueReason: string;
    createdAt: string;
  }>;
};

export function fetchEmployeeOnboarding(
  employeeId: number,
): Promise<OnboardingTimeline> {
  return jsonFetch(`/employees/${employeeId}/onboarding`);
}

export function fetchEmployeeDocuments(employeeId: number) {
  return jsonFetch<{ documents: OnboardingDocument[] }>(
    `/employees/${employeeId}/documents`,
  );
}

export function verifyDocument(documentId: string) {
  return jsonFetch(`/onboarding/documents/${documentId}/verify`, {
    method: "POST",
  });
}

export function rejectDocument(documentId: string, reason: string) {
  return jsonFetch(`/onboarding/documents/${documentId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function fetchOnboardingDocument(
  documentId: string,
): Promise<FetchedOnboardingDocument> {
  const res = await fetch(
    buildUrl(`/onboarding/documents/${documentId}/download`),
    { credentials: "include" },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? res.statusText);
  }

  const blob = await res.blob();
  const mimeType =
    res.headers.get("Content-Type")?.split(";")[0]?.trim() ||
    blob.type ||
    "application/octet-stream";
  const filename =
    filenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
    "document";

  return { blob, mimeType, filename };
}

export function approveOnboarding(employeeId: number, notes?: string) {
  return jsonFetch(`/onboarding/employees/${employeeId}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export function regenerateToken(
  employeeId: number,
  opts?: { resetPassword?: boolean; sendEmail?: boolean },
) {
  return jsonFetch(`/onboarding/employees/${employeeId}/regenerate-token`, {
    method: "POST",
    body: JSON.stringify(opts ?? {}),
  });
}

export function invalidateToken(employeeId: number) {
  return jsonFetch(`/onboarding/employees/${employeeId}/invalidate-token`, {
    method: "POST",
  });
}

export function fetchCompletionStats() {
  return jsonFetch<{
    byStatus: Record<string, number>;
    total: number;
    completed: number;
    completionRate: number;
  }>("/onboarding/reports/completion-stats");
}
