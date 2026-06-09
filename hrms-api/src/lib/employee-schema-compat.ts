import { eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/db/runtime";

import { employees } from "@/db/schema/hrms";



export type OnboardingPipelineStatus =

  | "PENDING"

  | "INVITATION_SENT"

  | "IN_PROGRESS"

  | "COMPLETED"

  | "EXPIRED";



export type ColumnSupport = {

  middleName: boolean;

  onboardingStatus: boolean;

  onboardingSubmittedAt: boolean;

  onboardingToken: boolean;

  onboardingTokenExpiry: boolean;

  onboardingTokenUsed: boolean;

  onboardingCompletedAt: boolean;

  /** employees.pan_no_hash exists */
  employeeSensitiveHashes: boolean;
  /** employee_identity_details.pan_number_hash exists */
  identitySensitiveHashes: boolean;
  /** employee_bank_details.account_number_hash exists */
  bankSensitiveHashes: boolean;
  /** Hash columns exist and ciphertext value columns are text (safe to encrypt). */
  employeeSensitiveEncryptionReady: boolean;
  identitySensitiveEncryptionReady: boolean;
  bankSensitiveEncryptionReady: boolean;
  /** @deprecated Use employeeSensitiveHashes */
  sensitiveHashes: boolean;
  personalEmailVerified: boolean;
  emailVerificationOtps: boolean;
  phoneVerified: boolean;
  phoneVerificationOtps: boolean;

};



const TRACKED_COLUMNS = [

  "middle_name",

  "onboarding_status",

  "onboarding_submitted_at",

  "onboarding_token",

  "onboarding_token_expiry",

  "onboarding_token_used",

  "onboarding_completed_at",

  "pan_no_hash",

  "personal_email_verified",

  "personal_email_verified_at",

  "phone_verified",

  "phone_verified_at",
] as const;



let cachedColumns: ColumnSupport | null = null;



// Generic so callers can declare the actual row shape (e.g. `<{ exists: boolean }>`
// for an EXISTS query, `<{ probe: string; has_hash: boolean; value_is_text: boolean }>`
// for the sensitive-column probe). Defaults to the column-name shape used by
// information_schema.columns lookups so existing callsites stay short.
function normalizeExecuteRows<T = { column_name: string }>(
  result: unknown,
): Array<T> {
  if (Array.isArray(result)) {
    return result as Array<T>;
  }
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: Array<T> }).rows;
  }
  return [];
}



export async function getEmployeeColumnSupport(): Promise<ColumnSupport> {

  if (cachedColumns) return cachedColumns;

  const result = await db.execute<{ column_name: string }>(sql`

    SELECT column_name::text AS column_name

    FROM information_schema.columns

    WHERE table_schema = 'public'

      AND table_name = 'employees'

      AND column_name IN (${sql.join(

        TRACKED_COLUMNS.map((c) => sql`${c}`),

        sql`, `,

      )})

  `);

  const cols = new Set(

    normalizeExecuteRows(result).map((r) => r.column_name),

  );

  const sensitiveResult = await db.execute<{
    probe: string;
    has_hash: boolean;
    value_is_text: boolean;
  }>(sql`
    SELECT
      required.probe::text AS probe,
      (c_hash.column_name IS NOT NULL) AS has_hash,
      (c_val.data_type = 'text') AS value_is_text
    FROM (
      VALUES
        ('employee', 'employees', 'pan_no_hash', 'pan_no'),
        ('identity', 'employee_identity_details', 'pan_number_hash', 'pan_number'),
        ('bank', 'employee_bank_details', 'account_number_hash', 'account_number')
    ) AS required(probe, table_name, hash_column, value_column)
    LEFT JOIN information_schema.columns c_hash
      ON c_hash.table_schema = 'public'
      AND c_hash.table_name = required.table_name
      AND c_hash.column_name = required.hash_column
    LEFT JOIN information_schema.columns c_val
      ON c_val.table_schema = 'public'
      AND c_val.table_name = required.table_name
      AND c_val.column_name = required.value_column
  `);

  const sensitiveByProbe = new Map(
    normalizeExecuteRows<{
      probe: string;
      has_hash: boolean;
      value_is_text: boolean;
    }>(sensitiveResult).map((r) => [
      r.probe,
      { hasHash: Boolean(r.has_hash), valueIsText: Boolean(r.value_is_text) },
    ]),
  );

  const otpTableResult = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'email_verification_otps'
    ) AS exists
  `);
  const otpTableRows = normalizeExecuteRows<{ exists: boolean }>(otpTableResult);

  const phoneOtpTableResult = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'phone_verification_otps'
    ) AS exists
  `);
  const phoneOtpTableRows = normalizeExecuteRows<{ exists: boolean }>(phoneOtpTableResult);
  const employeeProbe = sensitiveByProbe.get("employee");
  const identityProbe = sensitiveByProbe.get("identity");
  const bankProbe = sensitiveByProbe.get("bank");

  const employeeSensitiveHashes = employeeProbe?.hasHash ?? false;
  const identitySensitiveHashes = identityProbe?.hasHash ?? false;
  const bankSensitiveHashes = bankProbe?.hasHash ?? false;
  const employeeSensitiveEncryptionReady =
    employeeSensitiveHashes && (employeeProbe?.valueIsText ?? false);
  const identitySensitiveEncryptionReady =
    identitySensitiveHashes && (identityProbe?.valueIsText ?? false);
  const bankSensitiveEncryptionReady =
    bankSensitiveHashes && (bankProbe?.valueIsText ?? false);

  cachedColumns = {

    middleName: cols.has("middle_name"),

    onboardingStatus: cols.has("onboarding_status"),

    onboardingSubmittedAt: cols.has("onboarding_submitted_at"),

    onboardingToken: cols.has("onboarding_token"),

    onboardingTokenExpiry: cols.has("onboarding_token_expiry"),

    onboardingTokenUsed: cols.has("onboarding_token_used"),

    onboardingCompletedAt: cols.has("onboarding_completed_at"),

    employeeSensitiveHashes,
    identitySensitiveHashes,
    bankSensitiveHashes,
    employeeSensitiveEncryptionReady,
    identitySensitiveEncryptionReady,
    bankSensitiveEncryptionReady,
    sensitiveHashes: employeeSensitiveHashes,

    personalEmailVerified: cols.has("personal_email_verified"),

    emailVerificationOtps: otpTableRows[0]?.exists === true,

    phoneVerified: cols.has("phone_verified"),

    phoneVerificationOtps: phoneOtpTableRows[0]?.exists === true,
  };

  return cachedColumns;

}



export function clearEmployeeColumnSupportCache(): void {

  cachedColumns = null;

}



type OnboardingSignals = {

  onboardingStatus?: string | null;

  onboardingCompletedAt?: Date | string | null;

  onboardingToken?: string | null;

  onboardingTokenExpiry?: Date | string | null;

  onboardingTokenUsed?: boolean | null;

  onboardingSubmittedAt?: Date | string | null;

};



export function inferOnboardingStatus(

  row: OnboardingSignals,

): OnboardingPipelineStatus {

  if (row.onboardingStatus) {

    return row.onboardingStatus as OnboardingPipelineStatus;

  }

  if (row.onboardingCompletedAt) return "COMPLETED";

  if (row.onboardingSubmittedAt) return "IN_PROGRESS";

  if (row.onboardingToken) {

    const expiry =

      row.onboardingTokenExpiry != null

        ? new Date(row.onboardingTokenExpiry)

        : null;

    if (expiry && expiry.getTime() < Date.now()) return "EXPIRED";

    if (row.onboardingTokenUsed) return "IN_PROGRESS";

    return "INVITATION_SENT";

  }

  return "PENDING";

}



function inferredStatusSql(support: ColumnSupport): SQL {

  if (support.onboardingStatus) {

    return sql`${employees.onboardingStatus}`;

  }



  const parts: SQL[] = [];



  if (support.onboardingCompletedAt) {

    parts.push(

      sql`WHEN ${employees.onboardingCompletedAt} IS NOT NULL THEN 'COMPLETED'`,

    );

  }

  if (support.onboardingSubmittedAt) {

    parts.push(

      sql`WHEN ${employees.onboardingSubmittedAt} IS NOT NULL THEN 'IN_PROGRESS'`,

    );

  }

  if (support.onboardingToken && support.onboardingTokenExpiry) {

    parts.push(

      sql`WHEN ${employees.onboardingToken} IS NOT NULL

          AND ${employees.onboardingTokenExpiry} IS NOT NULL

          AND ${employees.onboardingTokenExpiry} < NOW() THEN 'EXPIRED'`,

    );

  }

  if (support.onboardingToken && support.onboardingTokenUsed) {

    parts.push(

      sql`WHEN ${employees.onboardingToken} IS NOT NULL

          AND ${employees.onboardingTokenUsed} = true THEN 'IN_PROGRESS'`,

    );

  }

  if (support.onboardingToken) {

    parts.push(

      sql`WHEN ${employees.onboardingToken} IS NOT NULL THEN 'INVITATION_SENT'`,

    );

  }



  if (parts.length === 0) {

    return sql`'PENDING'`;

  }



  return sql`(

    CASE

      ${sql.join(parts, sql` `)}

      ELSE 'PENDING'

    END

  )`;

}



export function onboardingStatusWhere(

  status: OnboardingPipelineStatus,

  support: ColumnSupport,

): SQL {

  if (support.onboardingStatus) {

    return eq(

      employees.onboardingStatus,

      status as (typeof employees.onboardingStatus.enumValues)[number],

    );

  }



  const hasOnboardingSignals =

    support.onboardingSubmittedAt ||

    support.onboardingToken ||

    support.onboardingCompletedAt;



  if (!hasOnboardingSignals) {

    return status === "PENDING" ? sql`true` : sql`false`;

  }



  return sql`${inferredStatusSql(support)} = ${status}`;

}



/** List/detail fields that exist on legacy hrms_dev + manual onboarding cols. */

export function employeeListSelect(support: ColumnSupport) {

  const fields: Record<string, unknown> = {

    id: employees.id,

    empId: employees.empId,

    firstName: employees.firstName,

    lastName: employees.lastName,

    personalEmail: employees.personalEmail,

    workEmail: employees.workEmail,

    phone: employees.phone,

    dob: employees.dob,

    gender: employees.gender,

    nationality: employees.nationality,

    maritalStatus: employees.maritalStatus,

    spouseName: employees.spouseName,

    departmentId: employees.departmentId,

    designationId: employees.designationId,

    gradeId: employees.gradeId,

    branchId: employees.branchId,

    reportingManagerId: employees.reportingManagerId,

    employeeStatus: employees.employeeStatus,

    joiningDate: employees.joiningDate,

    createdAt: employees.createdAt,

    updatedAt: employees.updatedAt,

  };

  if (support.middleName) fields.middleName = employees.middleName;

  if (support.onboardingStatus) fields.onboardingStatus = employees.onboardingStatus;

  if (support.onboardingSubmittedAt) {

    fields.onboardingSubmittedAt = employees.onboardingSubmittedAt;

  }

  if (support.onboardingTokenExpiry) {

    fields.onboardingTokenExpiry = employees.onboardingTokenExpiry;

  }

  if (support.onboardingTokenUsed) {

    fields.onboardingTokenUsed = employees.onboardingTokenUsed;

  }

  if (support.onboardingCompletedAt) {

    fields.onboardingCompletedAt = employees.onboardingCompletedAt;

  }

  return fields;

}



export function employeeDetailSelect(support: ColumnSupport) {

  const fields: Record<string, unknown> = {

    ...employeeListSelect(support),

    userId: employees.userId,

    bloodGroup: employees.bloodGroup,

    fatherName: employees.fatherName,

    motherName: employees.motherName,

    currentAddress: employees.currentAddress,

    permanentAddress: employees.permanentAddress,

    emergencyContactName: employees.emergencyContactName,

    emergencyContactPhone: employees.emergencyContactPhone,

    panNo: employees.panNo,

    uanNo: employees.uanNo,

    aadhaarNo: employees.aadhaarNo,

    esicNo: employees.esicNo,

    linkedinUrl: employees.linkedinUrl,

    profilePhotoUrl: employees.profilePhotoUrl,

    reportingChain: employees.reportingChain,

    employmentTypeId: employees.employmentTypeId,

    dateOfExit: employees.dateOfExit,

    payrollStatus: employees.payrollStatus,

  };

  return fields;

}



export function enrichEmployeeRow<T extends OnboardingSignals & Record<string, unknown>>(

  row: T,

  support: ColumnSupport,

): T & {

  middleName: string | null;

  onboardingStatus: OnboardingPipelineStatus;

  onboardingSubmittedAt: Date | string | null;

} {

  const onboardingStatus = inferOnboardingStatus(row);

  return {

    ...row,

    middleName:

      support.middleName && "middleName" in row

        ? ((row.middleName as string | null) ?? null)

        : null,

    onboardingStatus,

    onboardingSubmittedAt:

      support.onboardingSubmittedAt && "onboardingSubmittedAt" in row

        ? ((row.onboardingSubmittedAt as Date | string | null) ?? null)

        : null,

  };

}


