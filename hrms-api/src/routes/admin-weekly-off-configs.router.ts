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
import { and, asc, desc, eq, gte, inArray, lte, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  employees,
  weeklyOffConfigs,
  weeklyOffRosterEntries,
  weeklyOffScope,
} from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const adminWeeklyOffConfigsRouter: Router = Router();

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

// ───────────────────────── Roster planner ─────────────────────────
// Roster-mode configs have no formula — a planner assigns each scoped
// employee's off-days per date. These endpoints back the roster grid.

const EMP_SCOPE_COL = {
  Branch: employees.branchId,
  Department: employees.departmentId,
  SubDepartment: employees.subDepartmentId,
  Designation: employees.designationId,
  Grade: employees.gradeId,
  EmploymentType: employees.employmentTypeId,
  Employee: employees.id,
} as const;

// Active employees matching any of a config's scope rows (Company → everyone).
async function employeesInScope(configId: number) {
  const scopeRows = await db
    .select({ scopeType: weeklyOffScope.scopeType, scopeId: weeklyOffScope.scopeId })
    .from(weeklyOffScope)
    .where(eq(weeklyOffScope.configId, configId));

  const activeFilter = inArray(employees.employeeStatus, ["Active", "Probation", "Notice"]);
  const baseCols = {
    id: employees.id,
    empId: employees.empId,
    firstName: employees.firstName,
    lastName: employees.lastName,
  };

  if (scopeRows.some((r) => r.scopeType === "Company")) {
    return db.select(baseCols).from(employees).where(activeFilter).orderBy(employees.firstName);
  }

  const byType = new Map<keyof typeof EMP_SCOPE_COL, number[]>();
  for (const r of scopeRows) {
    if (r.scopeId == null) continue;
    const key = r.scopeType as keyof typeof EMP_SCOPE_COL;
    if (!(key in EMP_SCOPE_COL)) continue;
    const arr = byType.get(key) ?? [];
    arr.push(r.scopeId);
    byType.set(key, arr);
  }
  const conds: SQL[] = [];
  for (const [type, ids] of byType) conds.push(inArray(EMP_SCOPE_COL[type], ids));
  if (conds.length === 0) return [];

  return db
    .select(baseCols)
    .from(employees)
    .where(and(activeFilter, or(...conds)))
    .orderBy(employees.firstName);
}

function monthRange(month: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${String(last).padStart(2, "0")}` };
}

// GET /:id/roster?month=YYYY-MM — scoped employees + their off-days that month.
adminWeeklyOffConfigsRouter.get("/:id/roster", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    const range = monthRange(typeof req.query.month === "string" ? req.query.month : "");
    if (!range) throw new ApiError(400, "BAD_MONTH", "month=YYYY-MM is required.");

    const [config] = await db
      .select({ id: weeklyOffConfigs.id })
      .from(weeklyOffConfigs)
      .where(eq(weeklyOffConfigs.id, id))
      .limit(1);
    if (!config) throw new ApiError(404, "NOT_FOUND", "Weekly-off config not found.");

    const emps = await employeesInScope(id);
    const empIds = emps.map((e) => e.id);

    const entries =
      empIds.length === 0
        ? []
        : await db
            .select({
              employeeId: weeklyOffRosterEntries.employeeId,
              offDate: weeklyOffRosterEntries.offDate,
            })
            .from(weeklyOffRosterEntries)
            .where(
              and(
                inArray(weeklyOffRosterEntries.employeeId, empIds),
                gte(weeklyOffRosterEntries.offDate, range.from),
                lte(weeklyOffRosterEntries.offDate, range.to),
              ),
            );

    const offDates: Record<number, string[]> = {};
    for (const e of entries) {
      const ds = typeof e.offDate === "string" ? e.offDate : String(e.offDate).slice(0, 10);
      (offDates[e.employeeId] ??= []).push(ds);
    }

    res.json({
      data: {
        from: range.from,
        to: range.to,
        employees: emps.map((e) => ({
          id: e.id,
          empId: e.empId,
          name: `${e.firstName} ${e.lastName ?? ""}`.trim(),
        })),
        offDates,
      },
    });
  } catch (e) {
    next(e);
  }
});

const rosterSaveSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z
    .array(
      z.object({
        employeeId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .max(20000),
});

// PUT /:id/roster — replace the month's off-days for the config's scoped staff.
adminWeeklyOffConfigsRouter.put("/:id/roster", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    const body = rosterSaveSchema.parse(req.body ?? {});
    const range = monthRange(body.month);
    if (!range) throw new ApiError(400, "BAD_MONTH", "month=YYYY-MM is required.");

    const emps = await employeesInScope(id);
    const scopedIds = new Set(emps.map((e) => e.id));
    // Only accept entries for in-scope employees and in-month dates.
    const rows = body.entries.filter(
      (e) => scopedIds.has(e.employeeId) && e.date >= range.from && e.date <= range.to,
    );

    await db.transaction(async (tx) => {
      if (scopedIds.size > 0) {
        await tx
          .delete(weeklyOffRosterEntries)
          .where(
            and(
              inArray(weeklyOffRosterEntries.employeeId, [...scopedIds]),
              gte(weeklyOffRosterEntries.offDate, range.from),
              lte(weeklyOffRosterEntries.offDate, range.to),
            ),
          );
      }
      if (rows.length > 0) {
        await tx.insert(weeklyOffRosterEntries).values(
          rows.map((e) => ({ configId: id, employeeId: e.employeeId, offDate: e.date })),
        );
      }
    });

    res.json({ data: { saved: rows.length } });
  } catch (e) {
    next(e);
  }
});
