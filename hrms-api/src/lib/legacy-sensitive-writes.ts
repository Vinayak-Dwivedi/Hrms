import { sql } from "drizzle-orm";
import { db } from "@/db/runtime";

/** Inserts/updates that omit hash columns when they are not present in the DB yet. */

export async function insertBankDetailWithoutHashes(
  employeeId: number,
  data: Record<string, unknown>,
) {
  await db.execute(sql`
    INSERT INTO employee_bank_details (
      employee_id,
      account_number,
      account_name,
      bank_name,
      branch_name,
      ifsc_code,
      is_primary,
      passbook_document_id
    ) VALUES (
      ${employeeId},
      ${data.accountNumber as string},
      ${data.accountName as string},
      ${data.bankName as string},
      ${data.branchName as string},
      ${data.ifscCode as string},
      ${data.isPrimary as boolean},
      ${data.passbookDocumentId as string | null}
    )
  `);
}

export async function updateBankDetailWithoutHashes(
  id: number,
  employeeId: number,
  data: Record<string, unknown>,
) {
  await db.execute(sql`
    UPDATE employee_bank_details SET
      account_number = ${data.accountNumber as string},
      account_name = ${data.accountName as string},
      bank_name = ${data.bankName as string},
      branch_name = ${data.branchName as string},
      ifsc_code = ${data.ifscCode as string},
      is_primary = ${data.isPrimary as boolean},
      passbook_document_id = ${data.passbookDocumentId as string | null},
      updated_at = NOW()
    WHERE id = ${id} AND employee_id = ${employeeId}
  `);
}

export async function insertIdentityWithoutHashes(
  employeeId: number,
  data: Record<string, unknown>,
) {
  await db.execute(sql`
    INSERT INTO employee_identity_details (
      employee_id,
      pan_number,
      aadhaar_number,
      passport_number,
      passport_expiry,
      uan_number,
      esic_number
    ) VALUES (
      ${employeeId},
      ${data.panNumber as string | null},
      ${data.aadhaarNumber as string | null},
      ${data.passportNumber as string | null},
      ${data.passportExpiry as string | null},
      ${data.uanNumber as string | null},
      ${data.esicNumber as string | null}
    )
  `);
}

export async function updateIdentityWithoutHashes(
  employeeId: number,
  data: Record<string, unknown>,
) {
  await db.execute(sql`
    UPDATE employee_identity_details SET
      pan_number = ${data.panNumber as string | null},
      aadhaar_number = ${data.aadhaarNumber as string | null},
      passport_number = ${data.passportNumber as string | null},
      passport_expiry = ${data.passportExpiry as string | null},
      uan_number = ${data.uanNumber as string | null},
      esic_number = ${data.esicNumber as string | null},
      updated_at = NOW()
    WHERE employee_id = ${employeeId}
  `);
}
