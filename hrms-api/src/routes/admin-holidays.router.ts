// Global holiday CRUD (consolidated view). Mounted at /api/admin/holidays.
//
// The existing /api/admin/holiday-calendars router still owns the team
// (= calendar) CRUD. This router exposes holidays as first-class entities
// that can belong to many teams via the holiday_team_links join table.
//
// Endpoints:
//   GET    /                  — list every holiday with its team links
//   POST   /                  — create a holiday and link it to N teams
//   PATCH  /:id               — update fields and replace the team links
//   DELETE /:id               — delete the holiday + its link rows

import { Router } from "express";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  holidayCalendars,
  holidayTeamLinks,
  holidays,
} from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const adminHolidaysRouter: Router = Router();

const perHolidayScopeRowSchema = z.object({
  scopeType: z.enum([
    "Company",
    "Branch",
    "Location",
    "Department",
    "Designation",
    "Grade",
    "EmploymentType",
    "Employee",
  ]),
  scopeId: z.number().int().positive().nullable().optional(),
});

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1).max(200),
  type: z
    .enum(["National", "Regional", "Optional", "Restricted", "Festival"])
    .default("National"),
  isHalfDay: z.boolean().default(false),
  description: z.string().trim().max(500).optional().nullable(),
  scope: z.array(perHolidayScopeRowSchema).default([]),
  // Teams (calendar ids) this holiday applies to. Allowed to be empty when
  // creating standalone holidays that will be attached to teams later via
  // the Team dialog's holiday checklist.
  teamIds: z.array(z.number().int().positive()).default([]),
});

// PATCH must NOT carry defaults: a field absent from the request body has to
// stay `undefined` so the update leaves it alone. (`.partial()` keeps the
// `.default()`s, which would e.g. reset teamIds to [] and wipe a holiday's team
// assignments on an unrelated edit.)
const patchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  type: z
    .enum(["National", "Regional", "Optional", "Restricted", "Festival"])
    .optional(),
  isHalfDay: z.boolean().optional(),
  description: z.string().trim().max(500).optional().nullable(),
  scope: z.array(perHolidayScopeRowSchema).optional(),
  teamIds: z.array(z.number().int().positive()).optional(),
});

async function loadHolidayWithTeams(holidayId: number) {
  const [row] = await db
    .select()
    .from(holidays)
    .where(eq(holidays.id, holidayId))
    .limit(1);
  if (!row) return null;

  const links = await db
    .select({ calendarId: holidayTeamLinks.calendarId })
    .from(holidayTeamLinks)
    .where(eq(holidayTeamLinks.holidayId, holidayId));

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
    teamIds: links.map((l) => l.calendarId),
  };
}

// ── routes ────────────────────────────────────────────────────────────────

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

    // Pull holidays then batch-join their links so we don't fan out the row
    // count.
    const rows = await db
      .select()
      .from(holidays)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(holidays.date));

    if (rows.length === 0) {
      res.json({ data: [] });
      return;
    }

    const ids = rows.map((r) => r.id);
    const links = await db
      .select()
      .from(holidayTeamLinks)
      .where(inArray(holidayTeamLinks.holidayId, ids));

    const teamsByHoliday = new Map<number, number[]>();
    for (const l of links) {
      const arr = teamsByHoliday.get(l.holidayId) ?? [];
      arr.push(l.calendarId);
      teamsByHoliday.set(l.holidayId, arr);
    }

    res.json({
      data: rows.map((r) => ({
        id: r.id,
        date:
          typeof r.date === "string"
            ? r.date
            : new Date(r.date as unknown as string).toISOString().slice(0, 10),
        name: r.name,
        type: r.type,
        isHalfDay: r.isHalfDay,
        description: r.description,
        scope: Array.isArray(r.scope) ? r.scope : [],
        teamIds: teamsByHoliday.get(r.id) ?? [],
      })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/holidays
adminHolidaysRouter.post("/", async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);

    // Verify all team ids exist before we create anything.
    const validTeams = await db
      .select({ id: holidayCalendars.id })
      .from(holidayCalendars)
      .where(inArray(holidayCalendars.id, body.teamIds));
    const validIds = new Set(validTeams.map((t) => t.id));
    const missing = body.teamIds.filter((id) => !validIds.has(id));
    if (missing.length > 0) {
      throw new ApiError(
        400,
        "UNKNOWN_TEAM",
        `Unknown team id(s): ${missing.join(", ")}`,
      );
    }

    const newId = await db.transaction(async (tx) => {
      // For backward compat with anything still reading holidays.calendar_id,
      // we stash the first team as the canonical calendar. null when no
      // teams are attached at create time (standalone holiday).
      const [h] = await tx
        .insert(holidays)
        .values({
          calendarId: body.teamIds[0] ?? null,
          date: body.date,
          name: body.name,
          type: body.type,
          isHalfDay: body.isHalfDay,
          description: body.description ?? null,
          scope: body.scope,
        })
        .returning({ id: holidays.id });
      if (!h) {
        throw new ApiError(500, "INSERT_FAILED", "Holiday insert returned no row.");
      }

      if (body.teamIds.length > 0) {
        await tx.insert(holidayTeamLinks).values(
          body.teamIds.map((calendarId) => ({
            holidayId: h.id,
            calendarId,
          })),
        );
      }

      return h.id;
    });

    const full = await loadHolidayWithTeams(newId);
    res.status(201).json({ data: full });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/admin/holidays/:id  — replaces team links when supplied
adminHolidaysRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = patchSchema.parse(req.body);

    // Same team-existence guard as POST when team ids are supplied.
    if (body.teamIds !== undefined && body.teamIds.length > 0) {
      const validTeams = await db
        .select({ id: holidayCalendars.id })
        .from(holidayCalendars)
        .where(inArray(holidayCalendars.id, body.teamIds));
      const validIds = new Set(validTeams.map((t) => t.id));
      const missing = body.teamIds.filter((tid) => !validIds.has(tid));
      if (missing.length > 0) {
        throw new ApiError(
          400,
          "UNKNOWN_TEAM",
          `Unknown team id(s): ${missing.join(", ")}`,
        );
      }
    }

    await db.transaction(async (tx) => {
      const updates: Record<string, unknown> = {};
      if (body.date !== undefined) updates.date = body.date;
      if (body.name !== undefined) updates.name = body.name;
      if (body.type !== undefined) updates.type = body.type;
      if (body.isHalfDay !== undefined) updates.isHalfDay = body.isHalfDay;
      if (body.description !== undefined) {
        updates.description = body.description ?? null;
      }
      if (body.scope !== undefined) updates.scope = body.scope;
      if (body.teamIds !== undefined && body.teamIds.length > 0) {
        updates.calendarId = body.teamIds[0];
      }

      if (Object.keys(updates).length > 0) {
        const result = await tx
          .update(holidays)
          .set(updates)
          .where(eq(holidays.id, id))
          .returning({ id: holidays.id });
        if (result.length === 0) {
          throw new ApiError(404, "NOT_FOUND", "Holiday not found.");
        }
      } else {
        const [exists] = await tx
          .select({ id: holidays.id })
          .from(holidays)
          .where(eq(holidays.id, id))
          .limit(1);
        if (!exists) {
          throw new ApiError(404, "NOT_FOUND", "Holiday not found.");
        }
      }

      if (body.teamIds !== undefined) {
        await tx
          .delete(holidayTeamLinks)
          .where(eq(holidayTeamLinks.holidayId, id));
        if (body.teamIds.length > 0) {
          await tx.insert(holidayTeamLinks).values(
            body.teamIds.map((calendarId) => ({
              holidayId: id,
              calendarId,
            })),
          );
        }
      }
    });

    const full = await loadHolidayWithTeams(id);
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/admin/holidays/:id  — cascades to links
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

// Suppress the unused-import warning when sql isn't referenced.
void sql;
