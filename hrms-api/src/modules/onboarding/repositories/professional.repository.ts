import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeProfessionalDetails } from "@/db/schema/hrms";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";

export async function listProfessionalByEmployeeId(employeeId: number) {
  return db
    .select()
    .from(employeeProfessionalDetails)
    .where(eq(employeeProfessionalDetails.employeeId, employeeId));
}

export async function syncProfessionalDetails(
  employeeId: number,
  items: UpsertProfileInput["professional"],
) {
  const keepIds = items.map((i) => i.id).filter((id): id is number => !!id);

  if (keepIds.length > 0) {
    await db
      .delete(employeeProfessionalDetails)
      .where(
        and(
          eq(employeeProfessionalDetails.employeeId, employeeId),
          notInArray(employeeProfessionalDetails.id, keepIds),
        ),
      );
  } else {
    await db
      .delete(employeeProfessionalDetails)
      .where(eq(employeeProfessionalDetails.employeeId, employeeId));
  }

  for (const item of items) {
    if (item.id) {
      await db
        .update(employeeProfessionalDetails)
        .set({
          companyName: item.companyName,
          designation: item.designation,
          fromDate: item.fromDate,
          toDate: item.toDate ?? null,
          isCurrent: item.isCurrent ?? false,
          responsibilities: item.responsibilities?.trim() || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(employeeProfessionalDetails.id, item.id),
            eq(employeeProfessionalDetails.employeeId, employeeId),
          ),
        );
    } else {
      await db.insert(employeeProfessionalDetails).values({
        employeeId,
        companyName: item.companyName,
        designation: item.designation,
        fromDate: item.fromDate,
        toDate: item.toDate ?? null,
        isCurrent: item.isCurrent ?? false,
        responsibilities: item.responsibilities?.trim() || null,
      });
    }
  }
}
