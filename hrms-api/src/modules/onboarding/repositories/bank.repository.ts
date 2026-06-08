import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeBankDetails } from "@/db/schema/hrms";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";

export async function listBankByEmployeeId(employeeId: number) {
  return db
    .select()
    .from(employeeBankDetails)
    .where(eq(employeeBankDetails.employeeId, employeeId));
}

export async function syncBankDetails(
  employeeId: number,
  items: UpsertProfileInput["bank"],
) {
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
    if (item.id) {
      await db
        .update(employeeBankDetails)
        .set({
          accountNumber: item.accountNumber,
          accountName: item.accountName,
          bankName: item.bankName,
          branchName: item.branchName,
          ifscCode: item.ifscCode,
          isPrimary: item.isPrimary ?? false,
          passbookDocumentId: item.passbookDocumentId ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(employeeBankDetails.id, item.id),
            eq(employeeBankDetails.employeeId, employeeId),
          ),
        );
    } else {
      await db.insert(employeeBankDetails).values({
        employeeId,
        accountNumber: item.accountNumber,
        accountName: item.accountName,
        bankName: item.bankName,
        branchName: item.branchName,
        ifscCode: item.ifscCode,
        isPrimary: item.isPrimary ?? false,
        passbookDocumentId: item.passbookDocumentId ?? null,
      });
    }
  }
}

export async function hasPrimaryBank(employeeId: number) {
  const rows = await listBankByEmployeeId(employeeId);
  return rows.some((r) => r.isPrimary) || rows.length > 0;
}
