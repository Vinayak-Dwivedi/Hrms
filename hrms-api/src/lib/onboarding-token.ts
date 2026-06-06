import { createHash, randomBytes } from "node:crypto";
import { env } from "@/env";

export type OnboardingTokenStatus =
  | "VALID"
  | "NOT_FOUND"
  | "EXPIRED"
  | "ALREADY_USED"
  | "INACTIVE";

export type OnboardingEmployeeRow = {
  id: number;
  userId: string | null;
  workEmail: string | null;
  personalEmail: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  employeeStatus: string;
  onboardingToken: string | null;
  onboardingTokenExpiry: Date | null;
  onboardingTokenUsed: boolean;
  onboardingCompletedAt: Date | null;
};

export function hashOnboardingToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateOnboardingToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  return { rawToken, tokenHash: hashOnboardingToken(rawToken) };
}

export function buildOnboardingUrl(rawToken: string): string {
  const base = env.ONBOARDING_BASE_URL.replace(/\/$/, "");
  return `${base}?token=${encodeURIComponent(rawToken)}`;
}

export function onboardingTokenExpiryDate(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + env.ONBOARDING_TOKEN_TTL_HOURS);
  return expiry;
}

export function isTokenExpired(expiry: Date | null): boolean {
  if (!expiry) return true;
  return new Date() > expiry;
}

export function validateOnboardingToken(
  employee: OnboardingEmployeeRow | null | undefined,
): OnboardingTokenStatus {
  if (!employee || !employee.onboardingToken) {
    return "NOT_FOUND";
  }
  if (employee.employeeStatus !== "Active") {
    return "INACTIVE";
  }
  if (employee.onboardingTokenUsed) {
    return "ALREADY_USED";
  }
  if (isTokenExpired(employee.onboardingTokenExpiry)) {
    return "EXPIRED";
  }
  return "VALID";
}

export const ONBOARDING_ERROR_MESSAGES: Record<
  Exclude<OnboardingTokenStatus, "VALID">,
  string
> = {
  NOT_FOUND: "This onboarding link is invalid. Please contact HR.",
  EXPIRED:
    "Your onboarding link has expired. Please contact HR for a new invitation.",
  ALREADY_USED:
    "This onboarding link has already been used. Please log in or contact HR.",
  INACTIVE: "Your account is not active. Please contact HR.",
};

export function formatEmployeeDisplayName(parts: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [parts.firstName, parts.middleName, parts.lastName]
    .filter((part) => part?.trim())
    .join(" ");
}

export const REQUIRED_ONBOARDING_DOCUMENTS = [
  "Aadhaar Card",
  "PAN Card",
  "Resume",
] as const;

export const REQUIRED_ONBOARDING_PROFILE_FIELDS = [
  "currentAddress",
  "permanentAddress",
  "emergencyContactName",
  "emergencyContactPhone",
  "panNo",
  "aadhaarNo",
] as const;
