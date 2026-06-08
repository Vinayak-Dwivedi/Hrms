import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeAcademicDetails } from "@/db/schema/hrms";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";

export async function listAcademicByEmployeeId(employeeId: number) {
  return db
    .select()
    .from(employeeAcademicDetails)
    .where(eq(employeeAcademicDetails.employeeId, employeeId));
}

export async function syncAcademicDetails(
  employeeId: number,
  items: UpsertProfileInput["academic"],
) {
  const keepIds = items.map((i) => i.id).filter((id): id is number => !!id);

  if (keepIds.length > 0) {
    await db
      .delete(employeeAcademicDetails)
      .where(
        and(
          eq(employeeAcademicDetails.employeeId, employeeId),
          notInArray(employeeAcademicDetails.id, keepIds),
        ),
      );
  } else {
    await db
      .delete(employeeAcademicDetails)
      .where(eq(employeeAcademicDetails.employeeId, employeeId));
  }

  for (const item of items) {
    if (item.id) {
      await db
        .update(employeeAcademicDetails)
        .set({
          qualification: item.qualification,
          institution: item.institution,
          boardUniversity: item.boardUniversity?.trim() || null,
          fieldOfStudy: item.fieldOfStudy?.trim() || null,
          yearFrom: item.yearFrom ?? null,
          yearTo: item.yearTo ?? null,
          gradeOrPercentage: item.gradeOrPercentage?.trim() || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(employeeAcademicDetails.id, item.id),
            eq(employeeAcademicDetails.employeeId, employeeId),
          ),
        );
    } else {
      await db.insert(employeeAcademicDetails).values({
        employeeId,
        qualification: item.qualification,
        institution: item.institution,
        boardUniversity: item.boardUniversity?.trim() || null,
        fieldOfStudy: item.fieldOfStudy?.trim() || null,
        yearFrom: item.yearFrom ?? null,
        yearTo: item.yearTo ?? null,
        gradeOrPercentage: item.gradeOrPercentage?.trim() || null,
      });
    }
  }
}

export async function countAcademicByEmployeeId(employeeId: number) {
  const rows = await db
    .select({ id: employeeAcademicDetails.id })
    .from(employeeAcademicDetails)
    .where(eq(employeeAcademicDetails.employeeId, employeeId));
  return rows.length;
}
