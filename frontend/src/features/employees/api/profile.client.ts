import {
  fetchEmployeeProfile,
  profileToFormValues,
  updateEmployeeProfile,
  type EmployeeProfile,
} from "@/features/onboarding/api/onboarding.client";
import type { OnboardingProfileValues } from "@/features/onboarding/schemas/onboarding.schema";
import {
  academicDetailSchema,
  collectOnboardingBankErrors,
  optionalEsicSchema,
  optionalUanSchema,
} from "@/features/onboarding/schemas/onboarding.schema";
import {
  QUAL_CLASS_10,
  QUAL_CLASS_12,
} from "@/features/onboarding/constants/academic";
import {
  indianAadhaarSchema,
  indianPanSchema,
} from "@/lib/india-validation";
import { phoneFieldSchema } from "@/features/employees/schemas/employee.schema";
import { z } from "zod";
import { compressImageForUpload } from "@/lib/compress-image";
import {
  API_BASE,
  fetchMyProfile,
  resolveApiAssetUrl,
  updateMyProfile,
  type MyProfile,
} from "@/lib/hrms-client";

export type ProfileQualification = {
  id: string;
  qualification: string;
  institution: string;
  boardUniversity: string;
  yearOfPassing: string;
  gradePercentage: string;
};

export type ProfileEditableState = {
  phone: string;
  personalEmail: string;
  currentAddress: string;
  permanentAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  fatherName: string;
  motherName: string;
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  esicNumber: string;
  academics: ProfileQualification[];
  accountNumber: string;
  accountName: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  isPrimaryAccount: boolean;
};

export type EmployeeProfilePageData = {
  profile: MyProfile;
  extended: EmployeeProfile;
  form: ProfileEditableState;
};

export type ProfileFieldTab =
  | "contact"
  | "emergency"
  | "personal"
  | "academics"
  | "bank";

const profileContactSchema = z.object({
  phone: phoneFieldSchema,
  personalEmail: z
    .string()
    .trim()
    .min(1, "Personal email is required.")
    .email("Enter a valid personal email."),
});

const profileAddressSchema = z.object({
  currentAddress: z.string().trim().min(1, "Current address is required."),
  permanentAddress: z.string().trim().min(1, "Permanent address is required."),
});

const profileEmergencySchema = z.object({
  emergencyContactName: z
    .string()
    .trim()
    .min(1, "Emergency contact name is required."),
  emergencyContactPhone: phoneFieldSchema,
});

function zodIssuesToFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function mapOnboardingBankErrors(
  errors: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  const rename: Record<string, string> = {
    "bank.0.accountNumber": "accountNumber",
    "bank.0.accountName": "accountName",
    "bank.0.bankName": "bankName",
    "bank.0.branchName": "branchName",
    "bank.0.ifscCode": "ifscCode",
  };
  for (const [key, message] of Object.entries(errors)) {
    if (rename[key]) {
      out[rename[key]] = message;
      continue;
    }
    out[key] = message;
  }
  return out;
}

export function profileFieldErrorTab(fieldKey: string): ProfileFieldTab {
  if (fieldKey.startsWith("academics.")) return "academics";
  if (
    fieldKey === "accountNumber" ||
    fieldKey === "accountName" ||
    fieldKey === "bankName" ||
    fieldKey === "branchName" ||
    fieldKey === "ifscCode" ||
    fieldKey === "bank"
  ) {
    return "bank";
  }
  if (
    fieldKey === "emergencyContactName" ||
    fieldKey === "emergencyContactPhone"
  ) {
    return "emergency";
  }
  if (
    fieldKey === "fatherName" ||
    fieldKey === "motherName" ||
    fieldKey === "panNumber" ||
    fieldKey === "aadhaarNumber" ||
    fieldKey === "uanNumber" ||
    fieldKey === "esicNumber" ||
    fieldKey === "maritalStatus" ||
    fieldKey === "spouseName"
  ) {
    return "personal";
  }
  return "contact";
}

export function collectProfilePageFieldErrors(
  form: ProfileEditableState,
  extended: EmployeeProfile,
): Record<string, string> {
  const errors: Record<string, string> = {};

  const contactResult = profileContactSchema.safeParse({
    phone: form.phone,
    personalEmail: form.personalEmail,
  });
  if (!contactResult.success) {
    Object.assign(errors, zodIssuesToFieldErrors(contactResult.error.issues));
  }

  const addressResult = profileAddressSchema.safeParse({
    currentAddress: form.currentAddress,
    permanentAddress: form.permanentAddress,
  });
  if (!addressResult.success) {
    Object.assign(errors, zodIssuesToFieldErrors(addressResult.error.issues));
  }

  const emergencyResult = profileEmergencySchema.safeParse({
    emergencyContactName: form.emergencyContactName,
    emergencyContactPhone: form.emergencyContactPhone,
  });
  if (!emergencyResult.success) {
    Object.assign(errors, zodIssuesToFieldErrors(emergencyResult.error.issues));
  }

  if (!requiresExtendedProfileSections(form, extended)) {
    return errors;
  }

  Object.assign(errors, collectProfilePersonalErrors(form, extended));
  Object.assign(errors, collectProfileAcademicErrors(form.academics));
  Object.assign(
    errors,
    mapOnboardingBankErrors(
      collectOnboardingBankErrors(bankPayloadForValidation(form, extended)),
    ),
  );

  return errors;
}

function requiresExtendedProfileSections(
  form: ProfileEditableState,
  extended: EmployeeProfile,
): boolean {
  return (
    shouldPersistExtendedProfile(form, extended) ||
    form.academics.some(
      (row) =>
        row.qualification === QUAL_CLASS_10 ||
        row.qualification === QUAL_CLASS_12,
    )
  );
}

function collectProfilePersonalErrors(
  form: ProfileEditableState,
  extended: EmployeeProfile,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const base = profileToFormValues(extended);

  const panNo = form.panNumber.trim() || base.panNo;
  const panResult = indianPanSchema.safeParse(panNo);
  if (!panResult.success) {
    errors.panNumber =
      panResult.error.issues[0]?.message ?? "PAN number is required.";
  }

  const aadhaarNo = form.aadhaarNumber.trim() || base.aadhaarNo;
  const aadhaarResult = indianAadhaarSchema.safeParse(aadhaarNo);
  if (!aadhaarResult.success) {
    errors.aadhaarNumber =
      aadhaarResult.error.issues[0]?.message ?? "Aadhaar number is required.";
  }

  const uanNo = form.uanNumber.trim() || base.uanNo || "";
  const uanResult = optionalUanSchema.safeParse(uanNo);
  if (!uanResult.success) {
    errors.uanNumber =
      uanResult.error.issues[0]?.message ?? "Enter a valid UAN.";
  }

  const esicNo = form.esicNumber.trim() || base.esicNo || "";
  const esicResult = optionalEsicSchema.safeParse(esicNo);
  if (!esicResult.success) {
    errors.esicNumber =
      esicResult.error.issues[0]?.message ?? "Enter a valid ESIC number.";
  }

  return errors;
}

function collectProfileAcademicErrors(
  rows: ProfileQualification[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  rows.forEach((row, index) => {
    const isFixed =
      row.qualification === QUAL_CLASS_10 ||
      row.qualification === QUAL_CLASS_12;
    const hasAnyData =
      row.qualification.trim() ||
      row.institution.trim() ||
      row.boardUniversity.trim() ||
      row.yearOfPassing.trim() ||
      row.gradePercentage.trim();

    if (!isFixed && !hasAnyData) {
      return;
    }

    const parsed = academicDetailSchema.safeParse({
      id: parseAcademicId(row.id),
      qualification: row.qualification,
      qualificationOther: "",
      institution: row.institution,
      boardUniversity: row.boardUniversity,
      fieldOfStudy: "",
      yearFrom: undefined,
      yearTo: parseYear(row.yearOfPassing),
      gradeOrPercentage: row.gradePercentage,
    });

    if (parsed.success) {
      return;
    }

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      const formField =
        field === "yearTo"
          ? "yearOfPassing"
          : field === "gradeOrPercentage"
            ? "gradePercentage"
            : field;
      const key = `academics.${index}.${formField}`;
      if (!errors[key]) errors[key] = issue.message;
    }
  });

  return errors;
}

function bankPayloadForValidation(
  form: ProfileEditableState,
  extended: EmployeeProfile,
): { bank: OnboardingProfileValues["bank"] } {
  const base = profileToFormValues(extended);
  const fromEditable = bankFromEditable(form, base.bank);
  if (
    fromEditable.length > 0 &&
    fromEditable.some((row) => row.accountNumber.trim())
  ) {
    return { bank: fromEditable };
  }

  return {
    bank: [
      {
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        bankName: form.bankName,
        branchName: form.branchName,
        ifscCode: form.ifscCode,
        isPrimary: form.isPrimaryAccount,
      },
    ],
  };
}

function defaultProfileAcademics(): ProfileQualification[] {
  return [
    {
      id: "class-10",
      qualification: "Class 10",
      institution: "",
      boardUniversity: "",
      yearOfPassing: "",
      gradePercentage: "",
    },
    {
      id: "class-12",
      qualification: "Class 12",
      institution: "",
      boardUniversity: "",
      yearOfPassing: "",
      gradePercentage: "",
    },
  ];
}

function parseAcademicId(id: string): number | undefined {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function parseYear(value: string): number | undefined {
  const n = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(n) || n < 1950 || n > 2100) return undefined;
  return n;
}

function academicsFromEditable(
  rows: ProfileQualification[],
  base: OnboardingProfileValues["academic"],
): OnboardingProfileValues["academic"] {
  const mapped = rows
    .filter((r) => r.qualification.trim() || r.institution.trim())
    .map((r) => ({
      id: parseAcademicId(r.id),
      qualification: r.qualification.trim(),
      qualificationOther: "",
      institution: r.institution.trim(),
      boardUniversity: r.boardUniversity.trim(),
      fieldOfStudy: "",
      yearFrom: undefined,
      yearTo: parseYear(r.yearOfPassing),
      gradeOrPercentage: r.gradePercentage.trim(),
    }));

  return mapped.length > 0 ? mapped : base;
}

function bankFromEditable(
  form: ProfileEditableState,
  base: OnboardingProfileValues["bank"],
): OnboardingProfileValues["bank"] {
  const safeBase = base ?? [];
  const hasFormBank =
    form.accountNumber.trim() ||
    form.accountName.trim() ||
    form.bankName.trim() ||
    form.branchName.trim() ||
    form.ifscCode.trim();

  if (!hasFormBank) return safeBase;

  const existing = safeBase.find((b) => b.isPrimary) ?? safeBase[0];
  return [
    {
      id: existing?.id,
      accountNumber: form.accountNumber.trim(),
      accountName: form.accountName.trim(),
      bankName: form.bankName.trim(),
      branchName: form.branchName.trim(),
      ifscCode: form.ifscCode.trim(),
      isPrimary: form.isPrimaryAccount,
    },
  ];
}

export function profilePageToEditable(
  me: MyProfile,
  extended: EmployeeProfile,
): ProfileEditableState {
  const onboardingValues = profileToFormValues(extended);
  const primaryBank =
    extended.bank.find((b) => b.isPrimary) ?? extended.bank[0];

  return {
    phone: me.phone ?? "",
    personalEmail: me.personalEmail ?? "",
    currentAddress: me.currentAddress ?? onboardingValues.currentAddress,
    permanentAddress: me.permanentAddress ?? onboardingValues.permanentAddress,
    emergencyContactName:
      me.emergencyContactName ?? onboardingValues.emergencyContactName,
    emergencyContactPhone:
      me.emergencyContactPhone ?? onboardingValues.emergencyContactPhone,
    // OnboardingProfileValues marks these as optional (Zod `.optional()`);
    // the form expects plain strings, so default missing values to "".
    fatherName: onboardingValues.fatherName ?? "",
    motherName: onboardingValues.motherName ?? "",
    panNumber: onboardingValues.panNo ?? "",
    aadhaarNumber: onboardingValues.aadhaarNo ?? "",
    uanNumber: onboardingValues.uanNo ?? "",
    esicNumber: onboardingValues.esicNo ?? "",
    academics:
      extended.academic.length > 0
        ? extended.academic.map((a) => ({
            id: String(a.id),
            qualification: a.qualification,
            institution: a.institution,
            boardUniversity: a.boardUniversity ?? "",
            yearOfPassing: a.yearTo != null ? String(a.yearTo) : "",
            gradePercentage: a.gradeOrPercentage ?? "",
          }))
        : defaultProfileAcademics(),
    accountNumber: primaryBank?.accountNumber ?? "",
    accountName: primaryBank?.accountName ?? "",
    bankName: primaryBank?.bankName ?? "",
    branchName: primaryBank?.branchName ?? "",
    ifscCode: primaryBank?.ifscCode ?? "",
    isPrimaryAccount: primaryBank?.isPrimary ?? false,
  };
}

export function editableToOnboardingPayload(
  form: ProfileEditableState,
  loaded: EmployeeProfile,
): OnboardingProfileValues {
  const base = profileToFormValues(loaded);

  return {
    ...base,
    currentAddress: form.currentAddress.trim() || base.currentAddress,
    permanentAddress: form.permanentAddress.trim() || base.permanentAddress,
    emergencyContactName:
      form.emergencyContactName.trim() || base.emergencyContactName,
    emergencyContactPhone:
      form.emergencyContactPhone.trim() || base.emergencyContactPhone,
    fatherName: form.fatherName.trim(),
    motherName: form.motherName.trim(),
    panNo: form.panNumber.trim() || base.panNo,
    aadhaarNo: form.aadhaarNumber.trim() || base.aadhaarNo,
    uanNo: form.uanNumber.trim() || base.uanNo,
    esicNo: form.esicNumber.trim() || base.esicNo,
    academic: academicsFromEditable(form.academics, base.academic),
    bank: bankFromEditable(form, base.bank),
  };
}

export function shouldPersistExtendedProfile(
  form: ProfileEditableState,
  loaded: EmployeeProfile,
): boolean {
  const hasLoadedExtended =
    loaded.academic.length > 0 ||
    loaded.bank.length > 0 ||
    !!loaded.identity.panNumber ||
    !!loaded.identity.aadhaarNumber ||
    !!loaded.personal.fatherName ||
    !!loaded.personal.motherName;

  const hasFormExtended =
    !!form.fatherName.trim() ||
    !!form.motherName.trim() ||
    !!form.panNumber.trim() ||
    !!form.aadhaarNumber.trim() ||
    !!form.uanNumber.trim() ||
    !!form.esicNumber.trim() ||
    !!form.accountNumber.trim() ||
    form.academics.some((a) => a.institution.trim());

  return hasLoadedExtended || hasFormExtended;
}

export async function loadEmployeeProfilePage(): Promise<EmployeeProfilePageData> {
  const [profile, extended] = await Promise.all([
    fetchMyProfile(),
    fetchEmployeeProfile(),
  ]);

  return {
    profile,
    extended,
    form: profilePageToEditable(profile, extended),
  };
}

type ProfileApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: { retryAfterSeconds?: number };
  };
};

async function profileJsonFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ProfileApiErrorBody;
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    const err = new Error(
      body.error?.message ?? `Request failed (${res.status}).`,
    ) as Error & {
      code?: string;
      retryAfterSeconds?: number;
    };
    err.code = body.error?.code;
    err.retryAfterSeconds = body.error?.details?.retryAfterSeconds;
    throw err;
  }

  return (await res.json()) as T;
}

export type SendEmailOtpResult = {
  sent: boolean;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
};

export type VerifyEmailOtpResult = {
  verified: boolean;
  personalEmailVerifiedAt: string;
};

export function sendPersonalEmailVerificationOtp(): Promise<SendEmailOtpResult> {
  return profileJsonFetch<SendEmailOtpResult>(
    "/api/profile/send-email-verification-otp",
    { method: "POST" },
  );
}

export function resendPersonalEmailVerificationOtp(): Promise<SendEmailOtpResult> {
  return profileJsonFetch<SendEmailOtpResult>(
    "/api/profile/resend-email-verification-otp",
    { method: "POST" },
  );
}

export function verifyPersonalEmailOtp(
  otp: string,
): Promise<VerifyEmailOtpResult> {
  return profileJsonFetch<VerifyEmailOtpResult>(
    "/api/profile/verify-email-otp",
    {
      method: "POST",
      body: JSON.stringify({ otp }),
    },
  );
}

export type VerifyPhoneOtpResult = {
  verified: boolean;
  phoneVerifiedAt: string;
};

export function sendPersonalPhoneVerificationOtp(): Promise<SendEmailOtpResult> {
  return profileJsonFetch<SendEmailOtpResult>(
    "/api/profile/send-phone-verification-otp",
    { method: "POST" },
  );
}

export function resendPersonalPhoneVerificationOtp(): Promise<SendEmailOtpResult> {
  return profileJsonFetch<SendEmailOtpResult>(
    "/api/profile/resend-phone-verification-otp",
    { method: "POST" },
  );
}

export function verifyPersonalPhoneOtp(
  otp: string,
): Promise<VerifyPhoneOtpResult> {
  return profileJsonFetch<VerifyPhoneOtpResult>(
    "/api/profile/verify-phone-otp",
    {
      method: "POST",
      body: JSON.stringify({ otp }),
    },
  );
}

export async function uploadProfilePhoto(
  file: File,
): Promise<{ avatarUrl: string }> {
  const prepared = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append("file", prepared);

  const res = await fetch(`${API_BASE}/api/me/profile-photo`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error(
      body.error?.message ?? `Photo upload failed (${res.status}).`,
    );
  }

  const data = (await res.json()) as { avatarUrl: string };
  return {
    avatarUrl: resolveApiAssetUrl(data.avatarUrl) ?? data.avatarUrl,
  };
}

export async function saveEmployeeProfilePage(
  form: ProfileEditableState,
  loadedExtended: EmployeeProfile,
): Promise<EmployeeProfilePageData> {
  await updateMyProfile({
    phone: form.phone.trim(),
    personalEmail: form.personalEmail.trim(),
    currentAddress: form.currentAddress.trim(),
    permanentAddress: form.permanentAddress.trim(),
    emergencyContactName: form.emergencyContactName.trim(),
    emergencyContactPhone: form.emergencyContactPhone.trim(),
  });

  if (shouldPersistExtendedProfile(form, loadedExtended)) {
    await updateEmployeeProfile(
      editableToOnboardingPayload(form, loadedExtended),
    );
  }

  return loadEmployeeProfilePage();
}
