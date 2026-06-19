// Holiday CRUD. Mounted at /api/admin/holidays.
//
// Each holiday is a first-class row with its own per-holiday `scope`
// (Location → Branch / Department / Sub-Department / …) that decides which
// employees it applies to — an empty scope means the whole organisation.
// (Holiday calendars / teams were retired; `teamIds` is kept in the response as
// an empty array purely for backward-compatible client typing.)
//
// Endpoints:
//   GET    /        — list holidays (optionally filtered by date range)
//   POST   /        — create a holiday
//   PATCH  /:id     — update fields / scope
//   DELETE /:id     — delete the holiday

import { Router } from "express";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import { holidays } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const adminHolidaysRouter: Router = Router();

const perHolidayScopeRowSchema = z.object({
  scopeType: z.enum([
    "Company",
    "Branch",
    "Location",
    "Department",
    "SubDepartment",
    "Designation",
    "Grade",
    "EmploymentType",
    "Employee",
  ]),
  scopeId: z.number().int().positive().nullable().optional(),
});

const HOLIDAY_TYPES = [
  "National",
  "Regional",
  "Optional",
  "Restricted",
  "Festival",
] as const;

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1).max(200),
  type: z.enum(HOLIDAY_TYPES).default("National"),
  isHalfDay: z.boolean().default(false),
  description: z.string().trim().max(500).optional().nullable(),
  scope: z.array(perHolidayScopeRowSchema).default([]),
});

// PATCH carries no defaults so an absent field is left untouched.
const patchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  type: z.enum(HOLIDAY_TYPES).optional(),
  isHalfDay: z.boolean().optional(),
  description: z.string().trim().max(500).optional().nullable(),
  scope: z.array(perHolidayScopeRowSchema).optional(),
});

type HolidayRow = typeof holidays.$inferSelect;

function toApi(row: HolidayRow) {
  return {
    id: row.id,
    date:
      typeof row.date === "string"
        ? row.date
        : new Date(row.date as unknown as string).toISOString().slice(0, 10),
    name: row.name,
    type: row.type,
    isHalfDay: row.isHalfDay,
    description: row.description,
    scope: Array.isArray(row.scope) ? row.scope : [],
    teamIds: [] as number[],
  };
}

// GET /api/admin/holidays?from=YYYY-MM-DD&to=YYYY-MM-DD
adminHolidaysRouter.get("/", async (req, res, next) => {
  try {
    const from =
      typeof req.query.from === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(req.query.from)
        ? req.query.from
        : null;
    const to =
      typeof req.query.to === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)
        ? req.query.to
        : null;

    const filters = [];
    if (from) filters.push(gte(holidays.date, from));
    if (to) filters.push(lte(holidays.date, to));

    const rows = await db
      .select()
      .from(holidays)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(holidays.date));

    res.json({ data: rows.map(toApi) });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/holidays
adminHolidaysRouter.post("/", async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const [row] = await db
      .insert(holidays)
      .values({
        date: body.date,
        name: body.name,
        type: body.type,
        isHalfDay: body.isHalfDay,
        description: body.description ?? null,
        scope: body.scope,
      })
      .returning();
    if (!row) {
      throw new ApiError(500, "INSERT_FAILED", "Holiday insert returned no row.");
    }
    res.status(201).json({ data: toApi(row) });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/admin/holidays/:id
adminHolidaysRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = patchSchema.parse(req.body);

    const updates: Record<string, unknown> = {};
    if (body.date !== undefined) updates.date = body.date;
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.isHalfDay !== undefined) updates.isHalfDay = body.isHalfDay;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.scope !== undefined) updates.scope = body.scope;

    if (Object.keys(updates).length === 0) {
      const [row] = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);
      if (!row) throw new ApiError(404, "NOT_FOUND", "Holiday not found.");
      res.json({ data: toApi(row) });
      return;
    }

    const [row] = await db
      .update(holidays)
      .set(updates)
      .where(eq(holidays.id, id))
      .returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Holiday not found.");
    res.json({ data: toApi(row) });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/admin/holidays/:id
adminHolidaysRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const result = await db
      .delete(holidays)
      .where(eq(holidays.id, id))
      .returning({ id: holidays.id });
    if (result.length === 0) {
      throw new ApiError(404, "NOT_FOUND", "Holiday not found.");
    }
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
});
