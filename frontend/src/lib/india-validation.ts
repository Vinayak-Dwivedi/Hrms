import { z } from "zod";

/** Strip spaces, dashes, parentheses from phone input. */
export function normalizeIndianPhone(input: string): string {
  return input.replace(/[\s\-().]/g, "");
}

/** Indian mobile: 10 digits starting 6–9; optional +91 / 91 / 0 prefix. */
export function isValidIndianMobile(phone: string): boolean {
  const n = normalizeIndianPhone(phone);
  return (
    /^[6-9]\d{9}$/.test(n) ||
    /^(\+91|91)0?[6-9]\d{9}$/.test(n) ||
    /^0[6-9]\d{9}$/.test(n)
  );
}

export function normalizePan(input: string): string {
  return input.trim().toUpperCase().replace(/\s/g, "");
}

/** PAN: 5 letters + 4 digits + 1 letter; 4th char is holder type (P = individual). */
export function isValidIndianPan(pan: string): boolean {
  const p = normalizePan(pan);
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(p)) return false;
  const holderType = p[3];
  return "PCHFATBLJG".includes(holderType ?? "");
}

export function normalizeAadhaar(input: string): string {
  return input.replace(/\D/g, "");
}

/** Aadhaar: exactly 12 digits. */
export function isValidIndianAadhaar(input: string): boolean {
  return /^\d{12}$/.test(normalizeAadhaar(input));
}

export function normalizeIfsc(input: string): string {
  return input.trim().toUpperCase().replace(/\s/g, "");
}

/** IFSC: 4 letters + 0 + 6 alphanumeric (RBI format). */
export function isValidIndianIfsc(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizeIfsc(ifsc));
}

export function normalizeBankAccountNumber(input: string): string {
  return input.replace(/\s/g, "");
}

/** Indian bank account numbers are typically 9–18 digits. */
export function isValidIndianBankAccount(account: string): boolean {
  const n = normalizeBankAccountNumber(account);
  return /^\d{9,18}$/.test(n);
}

export function normalizeUan(input: string): string {
  return input.replace(/\D/g, "");
}

/** EPFO UAN is exactly 12 digits. */
export function isValidIndianUan(input: string): boolean {
  const n = normalizeUan(input);
  return /^\d{12}$/.test(n);
}

export function normalizeEsic(input: string): string {
  return input.replace(/\D/g, "");
}

/** ESIC IP number (10 digits) or full insurance number (17 digits). */
export function isValidIndianEsic(input: string): boolean {
  const n = normalizeEsic(input);
  if (!n) return true;
  return /^\d{10}$/.test(n) || /^\d{17}$/.test(n);
}

export const indianMobileSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .transform(normalizeIndianPhone)
  .refine(isValidIndianMobile, {
    message:
      "Enter a valid Indian mobile number (10 digits starting with 6–9; +91 optional).",
  });

export const indianPanSchema = z
  .string()
  .trim()
  .min(1, "PAN is required.")
  .transform(normalizePan)
  .refine(isValidIndianPan, {
    message: "Enter a valid PAN (e.g. ABCPD1234E).",
  });

export const indianAadhaarSchema = z
  .string()
  .trim()
  .min(1, "Aadhaar is required.")
  .transform(normalizeAadhaar)
  .refine(isValidIndianAadhaar, {
    message: "Enter a valid 12-digit Aadhaar number.",
  });

export const indianIfscSchema = z
  .string()
  .trim()
  .min(1, "IFSC code is required.")
  .transform(normalizeIfsc)
  .refine(isValidIndianIfsc, {
    message: "Enter a valid IFSC code (e.g. SBIN0001234).",
  });

export const indianBankAccountSchema = z
  .string()
  .trim()
  .min(1, "Account number is required.")
  .transform(normalizeBankAccountNumber)
  .refine(isValidIndianBankAccount, {
    message: "Account number must be 9–18 digits.",
  });

export const indianUanSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizeUan(v) : ""))
  .refine((v) => !v || isValidIndianUan(v), {
    message: "UAN must be exactly 12 digits.",
  });

export const indianEsicSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizeEsic(v) : ""))
  .refine((v) => !v || isValidIndianEsic(v), {
    message: "ESIC number must be 10 or 17 digits.",
  });
