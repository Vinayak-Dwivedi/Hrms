// Admin CRUD for shift configurations. Mounted at /api/admin/shift-configs.

import { Router } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import { shiftConfigs, shiftScope } from "@/db/schema/hrms";
import { parseTime } from "@/lib/attendance-import";
import { STANDARD_SHIFT_TIMINGS } from "@/modules/attendance/constants/standard-shift-timings";
import { ApiError } from "@/middleware/error";

export const adminShiftConfigsRouter: Router = Router();

const SCOPE_TYPES = [
  "Company",
  "Branch",
  "Location",
  "Department",
  "SubDepartment",
  "Designation",
  "Grade",
  "EmploymentType",
  "Employee",
] as const;
type ScopeType = (typeof SCOPE_TYPES)[number];

const scopeRowSchema = z
  .object({
    scopeType: z.enum(SCOPE_TYPES),
    scopeId: z.number().int().positive().nullable().optional(),
    priority: z.number().int().min(0).default(100),
  })
  .refine(
    (s) =>
      (s.scopeType === "Company" && s.scopeId == null) ||
      (s.scopeType !== "Company" && s.scopeId != null),
    "scope_id is required for non-Company scope, must be null for Company.",
  );

const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{1,2}:\d{2}(:\d{2})?$/, "Time must be HH:mm or HH:mm:ss");

function normalizeTimeInput(raw: string): string {
  const parsed = parseTime(raw);
  if (!parsed) {
    throw new ApiError(400, "INVALID_TIME", `Invalid time value: ${raw}`);
  }
  return parsed;
}

const upsertSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional().nullable(),
  startTime: timeSchema,
  endTime: timeSchema,
  status: z.enum(["Draft", "Published", "Archived"]).default("Draft"),
  isDefault: z.boolean().default(false),
  graceMinutes: z.coerce.number().int().min(0).max(120).default(0),
  breakMinutes: z.coerce.number().int().min(0).max(480).default(0),
  scope: z.array(scopeRowSchema).default([]),
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  status: z.enum(["Draft", "Published", "Archived"]).optional(),
  isDefault: z.boolean().optional(),
  graceMinutes: z.coerce.number().int().min(0).max(120).optional(),
  breakMinutes: z.coerce.number().int().min(0).max(480).optional(),
  scope: z.array(scopeRowSchema).optional(),
});

function formatTimeDisplay(t: string): string {
  const parts = t.split(":");
  return `${parts[0] ?? "00"}:${parts[1] ?? "00"}`;
}

async function loadFullConfig(configId: number) {
  const [cfg] = await db
    .select()
    .from(shiftConfigs)
    .where(eq(shiftConfigs.id, configId))
    .limit(1);
  if (!cfg) return null;

  const scopeRows = await db
    .select()
    .from(shiftScope)
    .where(eq(shiftScope.shiftConfigId, configId))
    .orderBy(asc(shiftScope.priority));

  return {
    id: cfg.id,
    name: cfg.name,
    description: cfg.description,
    startTime: cfg.startTime,
    endTime: cfg.endTime,
    startTimeDisplay: formatTimeDisplay(cfg.startTime),
    endTimeDisplay: formatTimeDisplay(cfg.endTime),
    status: cfg.status,
    isDefault: cfg.isDefault,
    graceMinutes: cfg.graceMinutes,
    breakMinutes: cfg.breakMinutes,
    createdBy: cfg.createdBy,
    createdAt: cfg.createdAt,
    updatedAt: cfg.updatedAt,
    scope: scopeRows.map((s) => ({
      id: s.id,
      scopeType: s.scopeType as ScopeType,
      scopeId: s.scopeId,
      priority: s.priority,
    })),
  };
}

function defaultScope(
  scope: z.infer<typeof scopeRowSchema>[],
): z.infer<typeof scopeRowSchema>[] {
  if (scope.length > 0) return scope;
  return [{ scopeType: "Company", scopeId: null, priority: 100 }];
}

async function insertScopeRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  configId: number,
  scope: z.infer<typeof scopeRowSchema>[],
) {
  const rows = defaultScope(scope);
  if (rows.length === 0) return;
  await tx.insert(shiftScope).values(
    rows.map((s) => ({
      shiftConfigId: configId,
      scopeType: s.scopeType,
      scopeId: s.scopeId ?? null,
      priority: s.priority,
    })),
  );
}

adminShiftConfigsRouter.get("/", async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : null;
    const rows = await db
      .select()
      .from(shiftConfigs)
      .where(statusFilter ? eq(shiftConfigs.status, statusFilter) : undefined)
      .orderBy(desc(shiftConfigs.updatedAt));
    res.json({
      data: rows.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        startTime: c.startTime,
        endTime: c.endTime,
        startTimeDisplay: formatTimeDisplay(c.startTime),
        endTimeDisplay: formatTimeDisplay(c.endTime),
        status: c.status,
        isDefault: c.isDefault,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminShiftConfigsRouter.get("/standards", async (_req, res, next) => {
  try {
    res.json({ data: STANDARD_SHIFT_TIMINGS });
  } catch (e) {
    next(e);
  }
});

adminShiftConfigsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const full = await loadFullConfig(id);
    if (!full) {
      throw new ApiError(404, "NOT_FOUND", "Shift config not found.");
    }
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});

adminShiftConfigsRouter.post("/", async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const startTime = normalizeTimeInput(body.startTime);
    const endTime = normalizeTimeInput(body.endTime);

    const createdId = await db.transaction(async (tx) => {
      const [cfg] = await tx
        .insert(shiftConfigs)
        .values({
          name: body.name,
          description: body.description ?? null,
          startTime,
          endTime,
          status: body.status,
          isDefault: body.isDefault,
          graceMinutes: body.graceMinutes,
          breakMinutes: body.breakMinutes,
        })
        .returning({ id: shiftConfigs.id });
      if (!cfg) {
        throw new ApiError(500, "INSERT_FAILED", "Insert returned no row.");
      }
      await insertScopeRows(tx, cfg.id, body.scope);
      return cfg.id;
    });

    const full = await loadFullConfig(createdId);
    res.status(201).json({ data: full });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/shift_configs_name_unique/i.test(msg)) {
      next(
        new ApiError(
          409,
          "DUPLICATE_NAME",
          "A shift with this name already exists.",
        ),
      );
      return;
    }
    next(e);
  }
});

adminShiftConfigsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = patchSchema.parse(req.body);

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(shiftConfigs)
        .where(eq(shiftConfigs.id, id))
        .limit(1);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Shift config not found.");
      }

      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) {
        updates.description = body.description ?? null;
      }
      if (body.startTime !== undefined) {
        updates.startTime = normalizeTimeInput(body.startTime);
      }
      if (body.endTime !== undefined) {
        updates.endTime = normalizeTimeInput(body.endTime);
      }
      if (body.status !== undefined) updates.status = body.status;
      if (body.isDefault !== undefined) updates.isDefault = body.isDefault;
      if (body.graceMinutes !== undefined) {
        updates.graceMinutes = body.graceMinutes;
      }
      if (body.breakMinutes !== undefined) {
        updates.breakMinutes = body.breakMinutes;
      }

      if (Object.keys(updates).length > 0) {
        await tx.update(shiftConfigs).set(updates).where(eq(shiftConfigs.id, id));
      }

      if (body.scope !== undefined) {
        await tx.delete(shiftScope).where(eq(shiftScope.shiftConfigId, id));
        await insertScopeRows(tx, id, body.scope);
      }
    });

    const full = await loadFullConfig(id);
    res.json({ data: full });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/shift_configs_name_unique/i.test(msg)) {
      next(
        new ApiError(
          409,
          "DUPLICATE_NAME",
          "A shift with this name already exists.",
        ),
      );
      return;
    }
    next(e);
  }
});

adminShiftConfigsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const [row] = await db
      .update(shiftConfigs)
      .set({ status: "Archived" })
      .where(eq(shiftConfigs.id, id))
      .returning({ id: shiftConfigs.id });
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Shift config not found.");
    }
    res.json({ data: { id: row.id, status: "Archived" } });
  } catch (e) {
    next(e);
  }
});
