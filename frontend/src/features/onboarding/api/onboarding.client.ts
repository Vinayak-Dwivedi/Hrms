import { API_BASE } from "@/lib/hrms-client";
import { compressImageForUpload } from "@/lib/compress-image";
import type { MaritalStatus } from "../constants/personal";
import {
  academicQualificationFromApi,
  DEFAULT_ACADEMIC_ROWS,
  QUAL_OTHER,
} from "../constants/academic";
import {
  listPendingRequiredDocuments,
  listRequiredOnboardingDocuments,
} from "../constants/documents";
import type {
  OnboardingBankFormValues,
  OnboardingProfileValues,
} from "../schemas/onboarding.schema";
import type { BloodGroupOption } from "../constants/blood-groups";

export type OnboardingValidateResult = {
  status: "VALID";
  workEmail: string | null;
  expiresAt: string | null;
};

export type OnboardingApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export class OnboardingRequestError extends Error {
  code: string;
  details?: unknown;

  constructor(error: OnboardingApiError) {
    super(error.message);
    this.name = "OnboardingRequestError";
    this.code = error.code;
    this.details = error.details;
  }
}

export type OnboardingDocumentRow = {
  id: string;
  documentType: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  status: "Pending" | "Uploaded" | "Verified" | "Rejected";
  createdAt: string;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
};

export type EmployeeProfile = {
  employeeId: number;
  onboardingStatus: string;
  completedAt: string | null;
  personal: {
    currentAddress: string | null;
    permanentAddress: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    fatherName: string | null;
    motherName: string | null;
    bloodGroup: string | null;
    nationality: string | null;
    maritalStatus: MaritalStatus | null;
    spouseName: string | null;
  };
  identity: {
    panNumber: string | null;
    aadhaarNumber: string | null;
    passportNumber: string | null;
    passportExpiry: string | null;
    uanNumber: string | null;
    esicNumber: string | null;
  };
  academic: Array<{
    id: number;
    qualification: string;
    institution: string;
    boardUniversity: string | null;
    fieldOfStudy: string | null;
    yearFrom: number | null;
    yearTo: number | null;
    gradeOrPercentage: string | null;
  }>;
  professional: Array<{
    id: number;
    companyName: string;
    designation: string;
    fromDate: string;
    toDate: string | null;
    isCurrent: boolean;
    responsibilities: string | null;
  }>;
  bank: Array<{
    id: number;
    accountNumber: string;
    accountName: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
    isPrimary: boolean;
    passbookDocumentId: string | null;
  }>;
  documents: OnboardingDocumentRow[];
};

export type OnboardingStatus = {
  completed: boolean;
  completedAt: string | null;
  profileComplete: boolean;
  bankComplete: boolean;
  bank: EmployeeProfile["bank"];
  academic: EmployeeProfile["academic"];
  requiredDocuments: ReturnType<typeof listRequiredOnboardingDocuments>;
  pendingDocuments: ReturnType<typeof listPendingRequiredDocuments>;
  documents: OnboardingDocumentRow[];
  onboardingStatus?: string;
};

async function parseError(res: Response): Promise<OnboardingApiError> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: {
      code?: string;
      message?: string;
      details?: {
        message?: string;
        postgresMessage?: string;
      };
    };
  };
  const fallbackDetail =
    body.error?.details?.postgresMessage ?? body.error?.details?.message;
  const message =
    body.error?.message && body.error.message !== "An unexpected error occurred."
      ? body.error.message
      : fallbackDetail ?? body.error?.message ?? res.statusText ?? "Request failed.";
  return {
    code: body.error?.code ?? "UNKNOWN",
    message,
    details: body.error?.details,
  };
}

async function authJsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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
    const apiErr = await parseError(res);
    throw new OnboardingRequestError(apiErr);
  }
  return (await res.json()) as T;
}

export async function validateOnboardingToken(
  token: string,
): Promise<OnboardingValidateResult> {
  const qs = new URLSearchParams({ token });
  const res = await fetch(`${API_BASE}/api/onboarding/validate?${qs}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as OnboardingValidateResult;
}

export async function onboardingLogin(params: {
  token: string;
  email: string;
  password: string;
}): Promise<{ redirectTo: string }> {
  const res = await fetch(`${API_BASE}/api/onboarding/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  const data = (await res.json()) as { redirectTo?: string };
  return { redirectTo: data.redirectTo ?? "/employee/onboarding/profile" };
}

export function fetchEmployeeProfile(): Promise<EmployeeProfile> {
  return authJsonFetch<EmployeeProfile>("/api/employee/profile");
}

export type OnboardingFormOptions = {
  bloodGroups: BloodGroupOption[];
};

export function fetchOnboardingFormOptions(): Promise<OnboardingFormOptions> {
  return authJsonFetch<OnboardingFormOptions>("/api/employee/form-options");
}

export function toProfilePayload(values: OnboardingProfileValues) {
  const academic = values.academic
    .filter((row) => {
      const qualification =
        row.qualification === QUAL_OTHER
          ? (row.qualificationOther ?? "").trim()
          : row.qualification.trim();
      return (
        qualification.length > 0 &&
        row.institution.trim().length > 0 &&
        row.yearTo != null &&
        (row.gradeOrPercentage ?? "").trim().length > 0
      );
    })
    .map((a) => ({
      id: a.id,
      qualification:
        a.qualification === QUAL_OTHER
          ? (a.qualificationOther ?? "").trim()
          : a.qualification,
      institution: a.institution,
      boardUniversity: a.boardUniversity || null,
      fieldOfStudy: a.fieldOfStudy || null,
      yearFrom: a.yearFrom ?? null,
      yearTo: a.yearTo ?? null,
      gradeOrPercentage: (a.gradeOrPercentage ?? "").trim() || null,
    }));

  const professional = (values.professional ?? [])
    .filter(
      (row) =>
        row.companyName.trim().length > 0 &&
        row.designation.trim().length > 0 &&
        row.fromDate.trim().length > 0,
    )
    .map((p) => ({
      id: p.id,
      companyName: p.companyName,
      designation: p.designation,
      fromDate: p.fromDate,
      toDate: p.toDate || null,
      isCurrent: p.isCurrent ?? false,
      responsibilities: p.responsibilities || null,
    }));

  return {
    personal: {
      currentAddress: values.currentAddress,
      permanentAddress: values.permanentAddress,
      emergencyContactName: values.emergencyContactName,
      emergencyContactPhone: values.emergencyContactPhone,
      fatherName: values.fatherName || null,
      motherName: values.motherName || null,
      bloodGroup: values.bloodGroup || null,
      nationality: values.nationality || "Indian",
      maritalStatus: values.maritalStatus,
      spouseName:
        values.maritalStatus === "Married"
          ? values.spouseName?.trim() || null
          : null,
    },
    identity: {
      panNumber: values.panNo,
      aadhaarNumber: values.aadhaarNo,
      uanNumber: values.uanNo?.trim() ? values.uanNo : null,
      esicNumber: values.esicNo?.trim() ? values.esicNo : null,
    },
    academic,
    professional,
  };
}

export async function updateEmployeeProfile(
  values: OnboardingProfileValues,
): Promise<EmployeeProfile> {
  return authJsonFetch<EmployeeProfile>("/api/employee/profile", {
    method: "PUT",
    body: JSON.stringify(toProfilePayload(values)),
  });
}

export function isBankComplete(profile: Pick<EmployeeProfile, "bank">): boolean {
  const primary =
    profile.bank.find((row) => row.isPrimary) ?? profile.bank[0];
  if (!primary) return false;
  return (
    primary.accountNumber.trim().length > 0 &&
    primary.accountName.trim().length > 0 &&
    primary.bankName.trim().length > 0 &&
    primary.branchName.trim().length > 0 &&
    primary.ifscCode.trim().length > 0
  );
}

export function bankFormValuesFromProfile(
  profile?: Pick<EmployeeProfile, "bank">,
): OnboardingBankFormValues {
  if (profile?.bank?.length) {
    return {
      bank: profile.bank.map((row) => ({
        id: row.id,
        accountNumber: row.accountNumber,
        accountName: row.accountName,
        bankName: row.bankName,
        branchName: row.branchName,
        ifscCode: row.ifscCode,
        isPrimary: row.isPrimary,
      })),
    };
  }
  return {
    bank: [
      {
        accountNumber: "",
        accountName: "",
        bankName: "",
        branchName: "",
        ifscCode: "",
        isPrimary: true,
      },
    ],
  };
}

export function toBankPayload(values: OnboardingBankFormValues) {
  return values.bank.map((row) => ({
    id: row.id,
    accountNumber: row.accountNumber,
    accountName: row.accountName,
    bankName: row.bankName,
    branchName: row.branchName,
    ifscCode: row.ifscCode,
    isPrimary: row.isPrimary ?? false,
  }));
}

export async function updateOnboardingBank(
  values: OnboardingBankFormValues,
): Promise<{ bankComplete: boolean; bank: EmployeeProfile["bank"] }> {
  const profile = await fetchEmployeeProfile();
  const payload = {
    ...toProfilePayload(profileToFormValues(profile)),
    bank: toBankPayload(values),
  };
  const updated = await authJsonFetch<EmployeeProfile>("/api/employee/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return {
    bankComplete: isBankComplete(updated),
    bank: updated.bank,
  };
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const profile = await fetchEmployeeProfile();
  const requiredDocuments = listRequiredOnboardingDocuments(profile.academic);
  const pendingDocuments = listPendingRequiredDocuments(
    profile.documents,
    profile.academic,
  );
  return {
    completed: profile.onboardingStatus === "COMPLETED",
    completedAt: profile.completedAt,
    profileComplete:
      !!profile.personal.currentAddress &&
      !!profile.identity.panNumber &&
      !!profile.identity.aadhaarNumber &&
      profile.academic.length > 0,
    bankComplete: isBankComplete(profile),
    bank: profile.bank,
    academic: profile.academic,
    requiredDocuments,
    pendingDocuments,
    documents: profile.documents,
    onboardingStatus: profile.onboardingStatus,
  };
}

export async function updateOnboardingProfile(
  values: OnboardingProfileValues,
): Promise<{ profileComplete: boolean }> {
  const profile = await updateEmployeeProfile(values);
  return {
    profileComplete:
      !!profile.personal.currentAddress &&
      !!profile.identity.panNumber &&
      !!profile.identity.aadhaarNumber &&
      profile.academic.length > 0,
  };
}

export async function uploadOnboardingDocument(
  documentType: string,
  file: File,
): Promise<OnboardingDocumentRow> {
  const prepared = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append("documentType", documentType);
  formData.append("file", prepared);

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return (await res.json()) as OnboardingDocumentRow;
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match =
    /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(
      header,
    );
  const raw = match?.[1] ?? match?.[2] ?? match?.[3];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/"/g, ""));
  } catch {
    return raw.replace(/"/g, "");
  }
}

export async function fetchOnboardingDocumentFile(documentId: string): Promise<{
  blob: Blob;
  mimeType: string;
  filename: string;
}> {
  const res = await fetch(`${API_BASE}/api/documents/${documentId}`, {
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw await parseError(res);
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

export async function deleteOnboardingDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents/${documentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw await parseError(res);
  }
}

export function submitOnboarding(): Promise<{
  submitted: boolean;
  onboardingStatus: string;
  submittedAt: string;
}> {
  return authJsonFetch("/api/employee/onboarding/submit", { method: "POST" });
}

export function completeOnboarding(): Promise<{
  completed: boolean;
  submitted: boolean;
}> {
  return submitOnboarding().then(() => ({ completed: false, submitted: true }));
}

export function profileToFormValues(
  profile: EmployeeProfile,
): OnboardingProfileValues {
  return {
    currentAddress: profile.personal.currentAddress ?? "",
    permanentAddress: profile.personal.permanentAddress ?? "",
    emergencyContactName: profile.personal.emergencyContactName ?? "",
    emergencyContactPhone: profile.personal.emergencyContactPhone ?? "",
    fatherName: profile.personal.fatherName ?? "",
    motherName: profile.personal.motherName ?? "",
    maritalStatus: profile.personal.maritalStatus ?? "Single",
    spouseName: profile.personal.spouseName ?? "",
    bloodGroup: profile.personal.bloodGroup ?? "",
    nationality: profile.personal.nationality ?? "Indian",
    panNo: profile.identity.panNumber ?? "",
    aadhaarNo: profile.identity.aadhaarNumber ?? "",
    uanNo: profile.identity.uanNumber ?? "",
    esicNo: profile.identity.esicNumber ?? "",
    academic:
      profile.academic.length > 0
        ? profile.academic.map((a) => {
            const mapped = academicQualificationFromApi(a.qualification);
            return {
              id: a.id,
              qualification: mapped.qualification,
              qualificationOther: mapped.qualificationOther ?? "",
              institution: a.institution,
              boardUniversity: a.boardUniversity ?? "",
              fieldOfStudy: a.fieldOfStudy ?? "",
              yearFrom: a.yearFrom ?? undefined,
              yearTo: a.yearTo ?? undefined,
              gradeOrPercentage: a.gradeOrPercentage ?? "",
            };
          })
        : DEFAULT_ACADEMIC_ROWS,
    professional: profile.professional.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      designation: p.designation,
      fromDate: p.fromDate,
      toDate: p.toDate ?? "",
      isCurrent: p.isCurrent,
      responsibilities: p.responsibilities ?? "",
    })),
  };
}
