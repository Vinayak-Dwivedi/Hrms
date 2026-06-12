import { ApiError } from "@/middleware/error";

type PostgresErrorLike = {
  code?: string;
  message?: string;
  detail?: string;
  constraint_name?: string;
  constraint?: string;
  cause?: unknown;
};

/** Walk Drizzle / postgres-js `cause` chain and return the innermost Postgres error. */
export function extractPostgresError(e: unknown): PostgresErrorLike | null {
  let cur: unknown = e;
  const seen = new Set<unknown>();
  let found: PostgresErrorLike | null = null;

  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const row = cur as PostgresErrorLike;
    if (typeof row.code === "string" && /^\d{5}$/.test(row.code)) {
      found = row;
    }
    cur = row.cause;
  }

  return found;
}

/** Unwrap Drizzle / postgres-js nested errors to the underlying Postgres message. */
export function extractDbErrorMessage(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  const seen = new Set<unknown>();

  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const row = cur as { message?: unknown; cause?: unknown; detail?: unknown };
    if (typeof row.message === "string" && row.message.length > 0) {
      parts.push(
        typeof row.detail === "string" && row.detail.length > 0
          ? `${row.message} (${row.detail})`
          : row.message,
      );
    }
    cur = row.cause;
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (!/^Failed query:/i.test(parts[i]!)) return parts[i]!;
  }

  if (e instanceof Error) return e.message;
  return String(e);
}

function duplicateContext(e: unknown): string {
  const msg = extractDbErrorMessage(e);
  const pg = extractPostgresError(e);
  const constraint = pg?.constraint_name ?? pg?.constraint ?? "";
  return `${msg} ${constraint}`.trim();
}

/** Map unique-violation and other common DB errors to API-friendly responses. */
export function mapDbErrorToApiError(e: unknown): ApiError {
  const msg = extractDbErrorMessage(e);
  const pg = extractPostgresError(e);
  const ctx = duplicateContext(e);

  if (pg?.code === "23505" || /unique|duplicate|23505/i.test(msg)) {
    if (/emp_id|employees_emp_id/i.test(ctx)) {
      return new ApiError(409, "DUPLICATE_EMP_ID", "Employee ID already exists.");
    }
    if (/personal_email/i.test(ctx)) {
      return new ApiError(409, "DUPLICATE_EMAIL", "Personal email already exists.");
    }
    if (/work_email|users_email/i.test(ctx)) {
      return new ApiError(409, "DUPLICATE_EMAIL", "Work email already exists.");
    }
    if (/pan_no_hash|pan_number_hash/i.test(ctx)) {
      return new ApiError(409, "DUPLICATE_PAN", "PAN number already registered.");
    }
    if (/aadhaar_no_hash|aadhaar_number_hash/i.test(ctx)) {
      return new ApiError(
        409,
        "DUPLICATE_AADHAAR",
        "Aadhaar number already registered.",
      );
    }
    if (/uan_no_hash|uan_number_hash/i.test(ctx)) {
      return new ApiError(409, "DUPLICATE_UAN", "UAN already registered.");
    }
    if (/esic_no_hash|esic_number_hash/i.test(ctx)) {
      return new ApiError(409, "DUPLICATE_ESIC", "ESIC number already registered.");
    }
    if (/account_number_hash/i.test(ctx)) {
      return new ApiError(
        409,
        "DUPLICATE_BANK_ACCOUNT",
        "Bank account number already registered.",
      );
    }
    if (/org_hierarchy_dept|org_hierarchy_sub_dept|org_hierarchy_structure|org_hierarchy_designations|org_hierarchy_grades|org_hierarchy_levels/i.test(ctx)) {
      return new ApiError(409, "DUPLICATE", "An org hierarchy record with this value already exists.");
    }
    return new ApiError(409, "DUPLICATE", "A record with this value already exists.");
  }

  if (/employee_documents.*rejected_|rejected_by|rejection_reason/i.test(msg)) {
    return new ApiError(
      503,
      "SCHEMA_NOT_READY",
      "Document rejection columns are missing. Run: npm run db:migrate-onboarding-pending",
    );
  }

  if (/onboarding_bank_approved/i.test(msg)) {
    return new ApiError(
      503,
      "SCHEMA_NOT_READY",
      "Database schema is missing onboarding bank approval columns. Run: npm run db:migrate-onboarding-bank-approval",
    );
  }

  return new ApiError(400, "INSERT_FAILED", msg);
}
