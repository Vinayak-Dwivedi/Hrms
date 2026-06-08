import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeIdentityDetails } from "@/db/schema/hrms";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";

export async function getIdentityByEmployeeId(employeeId: number) {
  const [row] = await db
    .select()
    .from(employeeIdentityDetails)
    .where(eq(employeeIdentityDetails.employeeId, employeeId))
    .limit(1);
  return row ?? null;
}

export async function upsertIdentity(
  employeeId: number,
  identity: UpsertProfileInput["identity"],
) {
  const existing = await getIdentityByEmployeeId(employeeId);
  const values = {
    panNumber: identity.panNumber,
    aadhaarNumber: identity.aadhaarNumber,
    passportNumber: identity.passportNumber?.trim() || null,
    passportExpiry: identity.passportExpiry ?? null,
    uanNumber: identity.uanNumber?.trim() || null,
    esicNumber: identity.esicNumber?.trim() || null,
    updatedAt: new Date(),
  };

  if (existing) {
    const [row] = await db
      .update(employeeIdentityDetails)
      .set(values)
      .where(eq(employeeIdentityDetails.employeeId, employeeId))
      .returning();
    return row!;
  }

  const [row] = await db
    .insert(employeeIdentityDetails)
    .values({ employeeId, ...values })
    .returning();
  return row!;
}
