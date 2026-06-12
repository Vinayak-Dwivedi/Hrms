// Admin CRUD for weekly-off configurations. Mounted at
// /api/admin/weekly-off-configs.
//
// Each configuration captures which days of the week are non-working for an
// employee group. Three modes are supported:
//   - Fixed       — settings.days is a list of day names
//   - Rotational  — settings.offsPerWeek + cycleWeeks; M4 expands to dates
//   - Roster      — manual schedule; settings.description is free-form
//
// POST/PATCH happen in a single transaction so config metadata + scope rows
// either all save or none do.

import { Router } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import { weeklyOffConfigs, weeklyOffScope } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const adminWeeklyOffConfigsRouter: Router = Router();

const SCOPE_TYPES = [
  "Company",
  "Branch",
  "Location",
  "Department",
  "Designation",
  "Grade",
  "EmploymentType",
  "Employee",
] as const;
type ScopeType = (typeof SCOPE_TYPES)[number];

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// ───── Zod schemas ────────────────────────────────────────────────────────

// A day that is off only on specific week-of-month occurrences (1–5), e.g.
// 2nd & 4th Saturday → { day: "Saturday", weeks: [2, 4] }.
const alternateDayRuleSchema = z.object({
  day: z.enum(DAY_NAMES),
  weeks: z.array(z.number().int().min(1).max(5)).default([]),
});

const fixedSettingsSchema = z.object({
  days: z.array(z.enum(DAY_NAMES)).default([]),
  alternateDays: z.array(alternateDayRuleSchema).optional(),
});

const rotationalSettingsSchema = z.object({
  offsPerWeek: z.number().int().min(1).max(7).default(1),
  cycleWeeks: z.number().int().min(1).max(12).default(4),
  // Optional pre-baked pattern: array of arrays of day names per week of cycle.
  pattern: z.array(z.array(z.enum(DAY_NAMES))).optional(),
});

const rosterSettingsSchema = z.object({
  description: z.string().trim().max(2000).default(""),
});

// Mode-specific settings live in a JSONB blob. Validate based on mode.
function settingsSchemaFor(mode: "Fixed" | "Rotational" | "Roster") {
  if (mode === "Fixed") return fixedSettingsSchema;
  if (mode === "Rotational") return rotationalSettingsSchema;
  return rosterSettingsSchema;
}

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

const upsertBaseSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["Draft", "Published", "Archived"]).default("Draft"),
  mode: z.enum(["Fixed", "Rotational", "Roster"]).default("Fixed"),
  // We validate `settings` after parsing the base; mode drives the shape.
  settings: z.record(z.string(), z.unknown()).default({}),
  scope: z.array(scopeRowSchema).default([]),
});

const patchBaseSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["Draft", "Published", "Archived"]).optional(),
  mode: z.enum(["Fixed", "Rotational", "Roster"]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  scope: z.array(scopeRowSchema).optional(),
});

// ───── shape helpers ──────────────────────────────────────────────────────

async function loadFullConfig(configId: number) {
  const [cfg] = await db
    .select()
    .from(weeklyOffConfigs)
    .where(eq(weeklyOffConfigs.id, configId))
    .limit(1);
  if (!cfg) return null;

  const scopeRows = await db
    .select()
    .from(weeklyOffScope)
    .where(eq(weeklyOffScope.configId, configId))
    .orderBy(asc(weeklyOffScope.priority));

  return {
    id: cfg.id,
    name: cfg.name,
    description: cfg.description,
    status: cfg.status,
    mode: cfg.mode,
    settings: cfg.settings,
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

// ───── routes ─────────────────────────────────────────────────────────────

adminWeeklyOffConfigsRouter.get("/", async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : null;
    const rows = await db
      .select()
      .from(weeklyOffConfigs)
      .where(
        statusFilter ? eq(weeklyOffConfigs.status, statusFilter) : undefined,
      )
      .orderBy(desc(weeklyOffConfigs.updatedAt));
    res.json({
      data: rows.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        mode: c.mode,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminWeeklyOffConfigsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const full = await loadFullConfig(id);
    if (!full) {
      throw new ApiError(404, "NOT_FOUND", "Weekly-off config not found.");
    }
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});

adminWeeklyOffConfigsRouter.post("/", async (req, res, next) => {
  try {
    const body = upsertBaseSchema.parse(req.body);
    // Validate settings shape against the chosen mode.
    const validatedSettings = settingsSchemaFor(body.mode).parse(body.settings);

    const createdId = await db.transaction(async (tx) => {
      const [cfg] = await tx
        .insert(weeklyOffConfigs)
        .values({
          name: body.name,
          description: body.description ?? null,
          status: body.status,
          mode: body.mode,
          settings: validatedSettings as Record<string, unknown>,
        })
        .returning({ id: weeklyOffConfigs.id });
      if (!cfg) {
        throw new ApiError(500, "INSERT_FAILED", "Insert returned no row.");
      }

      if (body.scope.length > 0) {
        await tx.insert(weeklyOffScope).values(
          body.scope.map((s) => ({
            configId: cfg.id,
            scopeType: s.scopeType,
            scopeId: s.scopeId ?? null,
            priority: s.priority,
          })),
        );
      }

      return cfg.id;
    });

    const full = await loadFullConfig(createdId);
    res.status(201).json({ data: full });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/weekly_off_configs_name_unique/i.test(msg)) {
      next(
        new ApiError(
          409,
          "DUPLICATE",
          "A weekly-off config with this name already exists.",
        ),
      );
      return;
    }
    next(e);
  }
});

adminWeeklyOffConfigsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = patchBaseSchema.parse(req.body);

    await db.transaction(async (tx) => {
      // Need the existing row to know which mode to validate `settings`
      // against when mode itself isn't being changed.
      const [existing] = await tx
        .select()
        .from(weeklyOffConfigs)
        .where(eq(weeklyOffConfigs.id, id))
        .limit(1);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Weekly-off config not found.");
      }

      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) {
        updates.description = body.description ?? null;
      }
      if (body.status !== undefined) updates.status = body.status;
      const effectiveMode = (body.mode ?? existing.mode) as
        | "Fixed"
        | "Rotational"
        | "Roster";
      if (body.mode !== undefined) updates.mode = body.mode;
      if (body.settings !== undefined) {
        updates.settings = settingsSchemaFor(effectiveMode).parse(
          body.settings,
        ) as Record<string, unknown>;
      }

      if (Object.keys(updates).length > 0) {
        await tx
          .update(weeklyOffConfigs)
          .set(updates)
          .where(eq(weeklyOffConfigs.id, id));
      }

      if (body.scope !== undefined) {
        await tx.delete(weeklyOffScope).where(eq(weeklyOffScope.configId, id));
        if (body.scope.length > 0) {
          await tx.insert(weeklyOffScope).values(
            body.scope.map((s) => ({
              configId: id,
              scopeType: s.scopeType,
              scopeId: s.scopeId ?? null,
              priority: s.priority,
            })),
          );
        }
      }
    });

    const full = await loadFullConfig(id);
    res.json({ data: full });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/weekly_off_configs_name_unique/i.test(msg)) {
      next(
        new ApiError(
          409,
          "DUPLICATE",
          "A weekly-off config with this name already exists.",
        ),
      );
      return;
    }
    next(e);
  }
});

adminWeeklyOffConfigsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const [row] = await db
      .delete(weeklyOffConfigs)
      .where(eq(weeklyOffConfigs.id, id))
      .returning({ id: weeklyOffConfigs.id });
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Weekly-off config not found.");
    }
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
});
