import {
  decryptSensitiveField,
  encryptSensitiveField,
} from "@/lib/sensitive-field-crypto";
import {
  normalizeAadhaar,
  normalizeBankAccountNumber,
  normalizeEsic,
  normalizePan,
  normalizeUan,
} from "@/lib/india-validation";

type FieldSpec = {
  column: string;
  hashColumn: string;
  normalize: (value: string) => string;
};

export const EMPLOYEE_LEGACY_SENSITIVE_FIELDS: FieldSpec[] = [
  { column: "panNo", hashColumn: "panNoHash", normalize: normalizePan },
  {
    column: "aadhaarNo",
    hashColumn: "aadhaarNoHash",
    normalize: normalizeAadhaar,
  },
  { column: "uanNo", hashColumn: "uanNoHash", normalize: normalizeUan },
  { column: "esicNo", hashColumn: "esicNoHash", normalize: normalizeEsic },
];

export const IDENTITY_SENSITIVE_FIELDS: FieldSpec[] = [
  {
    column: "panNumber",
    hashColumn: "panNumberHash",
    normalize: normalizePan,
  },
  {
    column: "aadhaarNumber",
    hashColumn: "aadhaarNumberHash",
    normalize: normalizeAadhaar,
  },
  {
    column: "passportNumber",
    hashColumn: "passportNumberHash",
    normalize: (v) => v.trim().toUpperCase(),
  },
  {
    column: "uanNumber",
    hashColumn: "uanNumberHash",
    normalize: normalizeUan,
  },
  {
    column: "esicNumber",
    hashColumn: "esicNumberHash",
    normalize: normalizeEsic,
  },
];

export const BANK_SENSITIVE_FIELDS: FieldSpec[] = [
  {
    column: "accountNumber",
    hashColumn: "accountNumberHash",
    normalize: normalizeBankAccountNumber,
  },
];

export const EMPLOYEE_CRUD_EXCLUDED_COLUMNS = [
  ...EMPLOYEE_LEGACY_SENSITIVE_FIELDS.flatMap((f) => [f.column, f.hashColumn]),
];

function encryptFields(
  payload: Record<string, unknown>,
  fields: FieldSpec[],
  options?: { includeHashes?: boolean },
): Record<string, unknown> {
  const includeHashes = options?.includeHashes !== false;
  // Hash columns are added with the encryption migration; without them, ciphertext
  // columns may still be varchar — store normalized plaintext until schema is ready.
  const encryptValues = includeHashes;
  const out: Record<string, unknown> = { ...payload };
  for (const field of fields) {
    const raw = out[field.column];
    if (raw === undefined) {
      continue;
    }
    if (raw == null || raw === "") {
      out[field.column] = null;
      if (includeHashes) {
        out[field.hashColumn] = null;
      }
      continue;
    }
    const normalized = field.normalize(String(raw));
    if (!encryptValues) {
      out[field.column] = normalized;
      continue;
    }
    const enc = encryptSensitiveField(normalized);
    out[field.column] = enc?.ciphertext ?? null;
    if (includeHashes) {
      out[field.hashColumn] = enc?.hash ?? null;
    }
  }
  return out;
}

function decryptFields<T extends Record<string, unknown>>(
  row: T,
  fields: FieldSpec[],
): T {
  const out = { ...row } as Record<string, unknown>;
  for (const field of fields) {
    const stored = out[field.column];
    if (typeof stored === "string") {
      out[field.column] = decryptSensitiveField(stored);
    }
    delete out[field.hashColumn];
  }
  return out as T;
}

export function encryptEmployeeLegacySensitive(
  payload: Record<string, unknown>,
  options?: { includeHashes?: boolean },
): Record<string, unknown> {
  return encryptFields(payload, EMPLOYEE_LEGACY_SENSITIVE_FIELDS, options);
}

export function decryptEmployeeLegacyRow<T extends Record<string, unknown>>(
  row: T,
): T {
  return decryptFields(row, EMPLOYEE_LEGACY_SENSITIVE_FIELDS);
}

export function encryptIdentitySensitive(
  payload: Record<string, unknown>,
  options?: { includeHashes?: boolean },
): Record<string, unknown> {
  return encryptFields(payload, IDENTITY_SENSITIVE_FIELDS, options);
}

export function decryptIdentityRow<T extends Record<string, unknown>>(
  row: T,
): T {
  return decryptFields(row, IDENTITY_SENSITIVE_FIELDS);
}

export function encryptBankSensitive(
  payload: Record<string, unknown>,
  options?: { includeHashes?: boolean },
): Record<string, unknown> {
  return encryptFields(payload, BANK_SENSITIVE_FIELDS, options);
}

export function decryptBankRow<T extends Record<string, unknown>>(row: T): T {
  return decryptFields(row, BANK_SENSITIVE_FIELDS);
}

export function hashForSensitiveLookup(
  field: FieldSpec,
  plain: string | null | undefined,
): string | null {
  if (plain == null || plain === "") {
    return null;
  }
  const enc = encryptSensitiveField(field.normalize(plain));
  return enc?.hash ?? null;
}
