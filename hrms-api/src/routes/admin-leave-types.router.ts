// Admin CRUD for the leave-type catalog. Mounted at /api/admin/leave-types.
// Powers the "Master Leave Types" tab on the Leave Policy settings page.
//
// All routes require auth; we don't enforce a role check here yet because the
// RBAC permission seed lives separately — that gate is the next layer.

import { Router } from "express";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { leaveTypes } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const adminLeaveTypesRouter: Router = Router();

const upsertSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(5),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
  isPaid: z.boolean().default(true),
  allowHalfDay: z.boolean().default(true),
  allowNegativeBalance: z.boolean().default(false),
  genderRestriction: z.enum(["Male", "Female"]).optional().nullable(),
  minNoticeDays: z.coerce.number().int().min(0).max(365).default(0),
  requiresProofAfterDays: z.coerce
    .number()
    .int()
    .min(0)
    .max(365)
    .optional()
    .nullable(),
  maxContinuousDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .nullable(),
  hourlyLeaveAllowed: z.boolean().default(false),
  carryForwardAllowed: z.boolean().default(false),
  encashmentAllowed: z.boolean().default(false),
  attachmentRequired: z.boolean().default(false),
  allowedInProbation: z.boolean().default(true),
});

function shape(row: typeof leaveTypes.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description ?? null,
    isActive: row.isActive,
    isPaid: row.isPaid,
    allowHalfDay: row.allowHalfDay,
    allowNegativeBalance: row.allowNegativeBalance,
    genderRestriction: row.genderRestriction ?? null,
    minNoticeDays: row.minNoticeDays,
    requiresProofAfterDays: row.requiresProofAfterDays ?? null,
    maxContinuousDays: row.maxContinuousDays ?? null,
    hourlyLeaveAllowed: row.hourlyLeaveAllowed,
    carryForwardAllowed: row.carryForwardAllowed,
    encashmentAllowed: row.encashmentAllowed,
    attachmentRequired: row.attachmentRequired,
    allowedInProbation: row.allowedInProbation,
  };
}

adminLeaveTypesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(leaveTypes)
      .orderBy(asc(leaveTypes.id));
    res.json({ data: rows.map(shape) });
  } catch (e) {
    next(e);
  }
});

adminLeaveTypesRouter.post("/", async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    try {
      const [row] = await db
        .insert(leaveTypes)
        .values({
          ...body,
          description: body.description ?? null,
          genderRestriction: body.genderRestriction ?? null,
          requiresProofAfterDays: body.requiresProofAfterDays ?? null,
          maxContinuousDays: body.maxContinuousDays ?? null,
        })
        .returning();
      res.status(201).json({ data: shape(row!) });
    } catch (e) {
      throw duplicateError(e);
    }
  } catch (e) {
    next(e);
  }
});

// Postgres names a `.unique()` constraint "<table>_<col>_key". Map a duplicate
// violation to a friendly 409 naming the exact field. The driver wraps the
// PostgresError as the `.cause` of a DrizzleQueryError, so check both.
function duplicateError(e: unknown): unknown {
  const err = e as { message?: string; cause?: { message?: string } };
  const m = `${err?.message ?? ""} ${err?.cause?.message ?? ""}`;
  if (/leave_types_code/i.test(m)) {
    return new ApiError(
      409,
      "DUPLICATE_CODE",
      "That code is already used by another leave type. Pick a different code.",
    );
  }
  if (/leave_types_name/i.test(m)) {
    return new ApiError(
      409,
      "DUPLICATE_NAME",
      "That name is already used by another leave type.",
    );
  }
  return e;
}

adminLeaveTypesRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = upsertSchema.partial().parse(req.body);
    let row;
    try {
      [row] = await db
        .update(leaveTypes)
        .set({
          ...body,
          description:
            body.description === undefined ? undefined : body.description ?? null,
          genderRestriction:
            body.genderRestriction === undefined
              ? undefined
              : body.genderRestriction ?? null,
          requiresProofAfterDays:
            body.requiresProofAfterDays === undefined
              ? undefined
              : body.requiresProofAfterDays ?? null,
          maxContinuousDays:
            body.maxContinuousDays === undefined
              ? undefined
              : body.maxContinuousDays ?? null,
        })
        .where(eq(leaveTypes.id, id))
        .returning();
    } catch (e) {
      throw duplicateError(e);
    }
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Leave type not found.");
    }
    res.json({ data: shape(row) });
  } catch (e) {
    next(e);
  }
});

// Hard delete — removes the row from the DB. Dependent leave_policies,
// leave_plan_allocations, leave_balances and leave_credit_transactions cascade
// away, but leave_requests reference it with ON DELETE RESTRICT, so a type that
// has ever been requested can't be removed — deactivate it instead.
adminLeaveTypesRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    let row;
    try {
      [row] = await db
        .delete(leaveTypes)
        .where(eq(leaveTypes.id, id))
        .returning();
    } catch (e) {
      const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
      const code = err?.code ?? err?.cause?.code;
      const msg = `${err?.message ?? ""} ${err?.cause?.message ?? ""}`;
      if (code === "23503" || /foreign key|leave_requests/i.test(msg)) {
        throw new ApiError(
          409,
          "IN_USE",
          "This leave type is used by existing leave requests and can't be deleted. Deactivate it instead.",
        );
      }
      throw e;
    }
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Leave type not found.");
    }
    res.json({ data: shape(row), deleted: true });
  } catch (e) {
    next(e);
  }
});
