// Per-employee shift override assignment (shift_scope Employee rows).

import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees, shiftConfigs, shiftScope } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";
import {
  resolveShiftForEmployee,
  type ResolvedShift,
} from "./shift-resolver";

export type EmployeeShiftAssignment = {
  overrideConfigId: number | null;
  resolved: ResolvedShift | null;
};

export async function getEmployeeShiftAssignment(
  employeeId: number,
): Promise<EmployeeShiftAssignment> {
  const [emp] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }

  const overrideRows = await db
    .select({ configId: shiftScope.shiftConfigId })
    .from(shiftScope)
    .innerJoin(shiftConfigs, eq(shiftScope.shiftConfigId, shiftConfigs.id))
    .where(
      and(
        eq(shiftScope.scopeType, "Employee"),
        eq(shiftScope.scopeId, employeeId),
        eq(shiftConfigs.status, "Published"),
      ),
    )
    .limit(1);

  const resolved = await resolveShiftForEmployee(employeeId);

  return {
    overrideConfigId: overrideRows[0]?.configId ?? null,
    resolved,
  };
}

export async function setEmployeeShiftOverride(
  employeeId: number,
  shiftConfigId: number | null,
): Promise<EmployeeShiftAssignment> {
  const [emp] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }

  if (shiftConfigId != null) {
    const [cfg] = await db
      .select({ id: shiftConfigs.id, status: shiftConfigs.status })
      .from(shiftConfigs)
      .where(eq(shiftConfigs.id, shiftConfigId))
      .limit(1);
    if (!cfg) {
      throw new ApiError(404, "NOT_FOUND", "Shift config not found.");
    }
    if (cfg.status !== "Published") {
      throw new ApiError(
        400,
        "SHIFT_NOT_PUBLISHED",
        "Only published shifts can be assigned to employees.",
      );
    }
  }

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: shiftScope.id })
      .from(shiftScope)
      .where(
        and(
          eq(shiftScope.scopeType, "Employee"),
          eq(shiftScope.scopeId, employeeId),
        ),
      );
    for (const row of existing) {
      await tx.delete(shiftScope).where(eq(shiftScope.id, row.id));
    }

    if (shiftConfigId != null) {
      await tx.insert(shiftScope).values({
        shiftConfigId,
        scopeType: "Employee",
        scopeId: employeeId,
        priority: 100,
      });
    }
  });

  return getEmployeeShiftAssignment(employeeId);
}
