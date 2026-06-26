import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeIdentityDetails } from "@/db/schema/hrms";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import {
  insertIdentityWithoutHashes,
  updateIdentityWithoutHashes,
} from "@/lib/legacy-sensitive-writes";
import {
  decryptIdentityRow,
  encryptIdentitySensitive,
} from "@/lib/sensitive-employee-fields";

function identitySelectShape(includeHashes: boolean) {
  const shape: Record<string, unknown> = {
    employeeId: employeeIdentityDetails.employeeId,
    panNumber: employeeIdentityDetails.panNumber,
    aadhaarNumber: employeeIdentityDetails.aadhaarNumber,
    passportNumber: employeeIdentityDetails.passportNumber,
    passportExpiry: employeeIdentityDetails.passportExpiry,
    uanNumber: employeeIdentityDetails.uanNumber,
    esicNumber: employeeIdentityDetails.esicNumber,
    createdAt: employeeIdentityDetails.createdAt,
    updatedAt: employeeIdentityDetails.updatedAt,
  };
  if (includeHashes) {
    shape.panNumberHash = employeeIdentityDetails.panNumberHash;
    shape.aadhaarNumberHash = employeeIdentityDetails.aadhaarNumberHash;
    shape.passportNumberHash = employeeIdentityDetails.passportNumberHash;
    shape.uanNumberHash = employeeIdentityDetails.uanNumberHash;
    shape.esicNumberHash = employeeIdentityDetails.esicNumberHash;
  }
  return shape;
}

export async function getIdentityByEmployeeId(employeeId: number) {
  const columnSupport = await getEmployeeColumnSupport();
  const selectShape = identitySelectShape(columnSupport.identitySensitiveHashes);
  const [row] = await db
    .select(selectShape as Record<string, typeof employeeIdentityDetails.employeeId>)
    .from(employeeIdentityDetails)
    .where(eq(employeeIdentityDetails.employeeId, employeeId))
    .limit(1);
  return row ? decryptIdentityRow(row as Record<string, unknown>) : null;
}

export async function upsertIdentity(
  employeeId: number,
  identity: UpsertProfileInput["identity"],
) {
  const existing = await getIdentityByEmployeeId(employeeId);
  const columnSupport = await getEmployeeColumnSupport();
  const values = encryptIdentitySensitive(
    {
      panNumber: identity.panNumber || null,
      aadhaarNumber: identity.aadhaarNumber || null,
      passportNumber: identity.passportNumber?.trim() || null,
      passportExpiry: identity.passportExpiry ?? null,
      uanNumber: identity.uanNumber?.trim() || null,
      esicNumber: identity.esicNumber?.trim() || null,
      updatedAt: new Date(),
    },
    { includeHashes: columnSupport.identitySensitiveEncryptionReady },
  );

  const includeHashes = columnSupport.identitySensitiveEncryptionReady;
  const selectShape = identitySelectShape(includeHashes);

  if (existing) {
    if (includeHashes) {
      // Drizzle returns `never[]` when selectShape is dynamic — cast through
      // a permissive row type so destructuring works.
      const rows = (await db
        .update(employeeIdentityDetails)
        .set(values)
        .where(eq(employeeIdentityDetails.employeeId, employeeId))
        .returning(selectShape as never)) as Array<Record<string, unknown>>;
      const [row] = rows;
      return row ? decryptIdentityRow(row) : null;
    }
    await updateIdentityWithoutHashes(employeeId, values);
    return getIdentityByEmployeeId(employeeId);
  }

  if (includeHashes) {
    const rows = (await db
      .insert(employeeIdentityDetails)
      .values({ employeeId, ...values })
      .returning(selectShape as never)) as Array<Record<string, unknown>>;
    const [row] = rows;
    return row ? decryptIdentityRow(row) : null;
  }

  await insertIdentityWithoutHashes(employeeId, values);
  return getIdentityByEmployeeId(employeeId);
}
