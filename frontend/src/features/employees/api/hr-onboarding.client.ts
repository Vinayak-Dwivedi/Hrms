import { ONBOARDING_PERMISSIONS } from "@/features/onboarding/constants/permissions";
import { API_BASE } from "@/lib/hrms-client";
import { compressImageForUpload } from "@/lib/compress-image";
import type { EmployeeProfile } from "@/features/onboarding/api/onboarding.client";
import {
  profileToFormValues,
  toProfilePayload,
} from "@/features/onboarding/api/onboarding.client";
import type {
  OnboardingBankFormValues,
  OnboardingProfileValues,
} from "@/features/onboarding/schemas/onboarding.schema";
import { REQUIRED_ONBOARDING_DOCUMENTS } from "@/features/onboarding/constants/documents";

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

export type OnboardingBankAccount = {
  id: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  isPrimary: boolean;
};

export type OnboardingBankState = {
  bankApprovedAt: string | null;
  bankApprovedBy: number | null;
  bankValid: boolean;
  bank: OnboardingBankAccount[];
};

export type OnboardingTimeline = {
  onboardingStatus: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  bankApprovedAt?: string | null;
  bankApprovedBy?: number | null;
  bankValid?: boolean;
  bank?: OnboardingBankAccount[];
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

export function fetchEmployeeOnboardingProfile(
  employeeId: number,
): Promise<EmployeeProfile> {
  return jsonFetch(`/employees/${employeeId}/onboarding/profile`);
}

export function updateEmployeeOnboardingProfileOnBehalf(
  employeeId: number,
  values: OnboardingProfileValues,
): Promise<EmployeeProfile> {
  return jsonFetch(`/employees/${employeeId}/onboarding/profile`, {
    method: "PUT",
    body: JSON.stringify(toProfilePayload(values)),
  });
}

export async function uploadOnboardingDocumentOnBehalf(
  employeeId: number,
  documentType: string,
  file: File,
) {
  const prepared = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append("documentType", documentType);
  formData.append("file", prepared);

  const res = await fetch(
    buildUrl(`/employees/${employeeId}/onboarding/documents`),
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: {
        message?: string;
        details?: { message?: string; postgresMessage?: string };
      };
    };
    const detail =
      body.error?.details?.postgresMessage ?? body.error?.details?.message;
    const message =
      body.error?.message && body.error.message !== "An unexpected error occurred."
        ? body.error.message
        : detail ?? body.error?.message ?? res.statusText;
    throw new Error(message);
  }

  return (await res.json()) as OnboardingDocument;
}

export function deleteOnboardingDocumentOnBehalf(
  employeeId: number,
  documentId: string,
) {
  return jsonFetch<{ deleted: boolean }>(
    `/employees/${employeeId}/onboarding/documents/${documentId}`,
    { method: "DELETE" },
  );
}

export function submitOnboardingOnBehalf(employeeId: number) {
  return jsonFetch<{
    submitted: boolean;
    onboardingStatus: string;
    submittedAt: string;
  }>(`/employees/${employeeId}/onboarding/submit`, { method: "POST" });
}

export function fetchOnboardingBank(
  employeeId: number,
): Promise<OnboardingBankState> {
  return jsonFetch(`/employees/${employeeId}/onboarding/bank`);
}

export function updateOnboardingBank(
  employeeId: number,
  values: OnboardingBankFormValues,
): Promise<OnboardingBankState> {
  return jsonFetch(`/employees/${employeeId}/onboarding/bank`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function approveOnboardingBank(employeeId: number) {
  return jsonFetch<{
    bankApprovedAt: string;
    bankApprovedBy: number;
  }>(`/employees/${employeeId}/onboarding/bank/approve`, {
    method: "POST",
  });
}

export const HR_VERIFICATION_DOCUMENTS = [
  "PAN Card",
  "Aadhaar Card",
  "Resume",
] as const;

export type OnboardingPipelineStep = {
  number: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  status: "pending" | "active" | "done";
  permission: string;
};

export function computeOnboardingPipeline(timeline: OnboardingTimeline) {
  const isCompleted = timeline.onboardingStatus === "COMPLETED";
  const isSubmitted = timeline.submittedAt != null;
  const hasRejected = timeline.documents.some((d) => d.status === "Rejected");
  const bankApproved = timeline.bankApprovedAt != null;

  const docStatus = (type: string) =>
    timeline.documents.find((d) => d.documentType === type)?.status;

  const missingVerified = HR_VERIFICATION_DOCUMENTS.filter(
    (type) => docStatus(type) !== "Verified",
  );
  const requiredVerified = missingVerified.length === 0;

  const canMarkComplete =
    isSubmitted && requiredVerified && bankApproved && !isCompleted;

  const steps: OnboardingPipelineStep[] = [
    {
      number: 1,
      label: "Submit employee data",
      description: "Profile, documents, and submit for HR review",
      status: isCompleted || isSubmitted ? "done" : "active",
      permission: ONBOARDING_PERMISSIONS.MANAGE,
    },
    {
      number: 2,
      label: "Verify required documents",
      description:
        "On-behalf uploads are verified automatically; employee uploads need HR approval",
      status: isCompleted
        ? "done"
        : requiredVerified
          ? "done"
          : isSubmitted
            ? "active"
            : "pending",
      permission: ONBOARDING_PERMISSIONS.VERIFY_DOCUMENTS,
    },
    {
      number: 3,
      label: "Bank account details",
      description: "Accounts team adds and approves payroll bank information",
      status: isCompleted
        ? "done"
        : bankApproved
          ? "done"
          : isSubmitted && requiredVerified
            ? "active"
            : "pending",
      permission: ONBOARDING_PERMISSIONS.MANAGE_BANK,
    },
    {
      number: 4,
      label: "Mark onboarding complete",
      description: "Finalize onboarding after all reviews",
      status: isCompleted
        ? "done"
        : canMarkComplete
          ? "active"
          : "pending",
      permission: ONBOARDING_PERMISSIONS.MANAGE,
    },
  ];

  return {
    isCompleted,
    isSubmitted,
    hasRejected,
    requiredVerified,
    bankApproved,
    canMarkComplete,
    missingVerified: [...missingVerified],
    steps,
    currentStep: isCompleted
      ? 4
      : !isSubmitted
        ? 1
        : !requiredVerified
          ? 2
          : !bankApproved
            ? 3
            : 4,
  };
}

export function computeOnboardingReadiness(profile: EmployeeProfile) {
  const pendingDocuments = REQUIRED_ONBOARDING_DOCUMENTS.filter(
    (type) => !profile.documents.some((d) => d.documentType === type),
  );
  const profileComplete =
    !!profile.personal.currentAddress &&
    !!profile.personal.permanentAddress &&
    !!profile.personal.emergencyContactName &&
    !!profile.personal.emergencyContactPhone &&
    (profile.personal.maritalStatus === "Single" ||
      profile.personal.maritalStatus === "Married") &&
    (profile.personal.maritalStatus !== "Married" ||
      !!profile.personal.spouseName?.trim()) &&
    !!profile.identity.panNumber &&
    !!profile.identity.aadhaarNumber &&
    profile.academic.length > 0;

  return {
    profileComplete,
    pendingDocuments,
    formValues: profileToFormValues(profile),
    documents: profile.documents,
  };
}

export function fetchCompletionStats() {
  return jsonFetch<{
    byStatus: Record<string, number>;
    total: number;
    completed: number;
    completionRate: number;
  }>("/onboarding/reports/completion-stats");
}

export type PendingReviewEmployee = {
  id: number;
  empId: string;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  onboardingStatus: string;
  onboardingSubmittedAt: string | null;
};

export function fetchPendingReviewEmployees() {
  return jsonFetch<{ employees: PendingReviewEmployee[] }>(
    "/onboarding/employees/pending-review",
  );
}
