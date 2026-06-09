import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeBankDetails } from "@/db/schema/hrms";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import {
  insertBankDetailWithoutHashes,
  updateBankDetailWithoutHashes,
} from "@/lib/legacy-sensitive-writes";
import {
  decryptBankRow,
  encryptBankSensitive,
} from "@/lib/sensitive-employee-fields";

function encryptBankItem(
  item: UpsertProfileInput["bank"][number],
  includeHashes: boolean,
) {
  return encryptBankSensitive(
    {
    accountNumber: item.accountNumber,
    accountName: item.accountName,
    bankName: item.bankName,
    branchName: item.branchName,
    ifscCode: item.ifscCode,
    isPrimary: item.isPrimary ?? false,
    passbookDocumentId: item.passbookDocumentId ?? null,
    },
    { includeHashes },
  );
}

function bankSelectShape(includeHashes: boolean) {
  const shape: Record<string, unknown> = {
    id: employeeBankDetails.id,
    employeeId: employeeBankDetails.employeeId,
    accountNumber: employeeBankDetails.accountNumber,
    accountName: employeeBankDetails.accountName,
    bankName: employeeBankDetails.bankName,
    branchName: employeeBankDetails.branchName,
    ifscCode: employeeBankDetails.ifscCode,
    isPrimary: employeeBankDetails.isPrimary,
    passbookDocumentId: employeeBankDetails.passbookDocumentId,
    createdAt: employeeBankDetails.createdAt,
    updatedAt: employeeBankDetails.updatedAt,
  };
  if (includeHashes) {
    shape.accountNumberHash = employeeBankDetails.accountNumberHash;
  }
  return shape;
}

export async function listBankByEmployeeId(employeeId: number) {
  const columnSupport = await getEmployeeColumnSupport();
  const selectShape = bankSelectShape(columnSupport.bankSensitiveHashes);
  const rows = await db
    .select(selectShape as Record<string, typeof employeeBankDetails.id>)
    .from(employeeBankDetails)
    .where(eq(employeeBankDetails.employeeId, employeeId));
  return rows.map((row) => decryptBankRow(row as Record<string, unknown>));
}

export async function syncBankDetails(
  employeeId: number,
  items: UpsertProfileInput["bank"],
) {
  const columnSupport = await getEmployeeColumnSupport();
  const includeHashes = columnSupport.bankSensitiveEncryptionReady;
  const keepIds = items.map((i) => i.id).filter((id): id is number => !!id);

  if (keepIds.length > 0) {
    await db
      .delete(employeeBankDetails)
      .where(
        and(
          eq(employeeBankDetails.employeeId, employeeId),
          notInArray(employeeBankDetails.id, keepIds),
        ),
      );
  } else {
    await db
      .delete(employeeBankDetails)
      .where(eq(employeeBankDetails.employeeId, employeeId));
  }

  for (const item of items) {
    const encrypted = encryptBankItem(item, includeHashes);
    if (item.id) {
      if (includeHashes) {
        await db
          .update(employeeBankDetails)
          .set({
            ...encrypted,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(employeeBankDetails.id, item.id),
              eq(employeeBankDetails.employeeId, employeeId),
            ),
          );
      } else {
        await updateBankDetailWithoutHashes(item.id, employeeId, encrypted);
      }
    } else if (includeHashes) {
      await db.insert(employeeBankDetails).values({
        employeeId,
        ...encrypted,
      });
    } else {
      await insertBankDetailWithoutHashes(employeeId, encrypted);
    }
  }
}

export async function hasPrimaryBank(employeeId: number) {
  const rows = await listBankByEmployeeId(employeeId);
  return rows.some((r) => r.isPrimary) || rows.length > 0;
}
