// Admin CRUD for holiday calendars + their holidays. Mounted at
// /api/admin/holiday-calendars.
//
// Each calendar is a named bundle (Corporate, Delhi, Uttarakhand, Beetel)
// containing a list of holidays. Scope assignment (which calendar applies to
// which employees) is stored in holiday_calendar_scope and consumed by the
// resolver shipped in M4.
//
// POST/PATCH happen in a single transaction so the calendar metadata, its
// holidays and its scope rows either all save or none do.

import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  holidayCalendars,
  holidayCalendarScope,
  holidayTeamLinks,
  holidays,
} from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const adminHolidayCalendarsRouter: Router = Router();

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

// ───── Zod schemas ────────────────────────────────────────────────────────

// Per-holiday scope row — narrows the holiday to specific employee groups.
// Stored as JSONB so we don't need a separate table just for these.
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

const holidayRowSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  name: z.string().trim().min(1).max(200),
  type: z
    .enum(["National", "Regional", "Optional", "Restricted", "Festival"])
    .default("National"),
  isHalfDay: z.boolean().default(false),
  description: z.string().trim().max(500).optional().nullable(),
  scope: z.array(perHolidayScopeRowSchema).default([]),
});

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

const calendarUpsertSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["Draft", "Published", "Archived"]).default("Draft"),
  // Inline-created holidays (Holiday Calendar legacy flow).
  holidays: z.array(holidayRowSchema).default([]),
  scope: z.array(scopeRowSchema).default([]),
  // M-policy: existing holiday ids to link via holiday_team_links. Used by
  // the Add Team dialog's holiday checklist.
  holidayIds: z.array(z.number().int().positive()).default([]),
});

// PATCH: holidays/scope are omit-when-missing (not defaulted to []),
// otherwise the caller silently wipes them.
const calendarPatchSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["Draft", "Published", "Archived"]).optional(),
  holidays: z.array(holidayRowSchema).optional(),
  scope: z.array(scopeRowSchema).optional(),
  holidayIds: z.array(z.number().int().positive()).optional(),
});

// ───── shape helpers ──────────────────────────────────────────────────────

async function loadFullCalendar(calendarId: number) {
  const [cal] = await db
    .select()
    .from(holidayCalendars)
    .where(eq(holidayCalendars.id, calendarId))
    .limit(1);
  if (!cal) return null;

  const holidayRows = await db
    .select()
    .from(holidays)
    .where(eq(holidays.calendarId, calendarId))
    .orderBy(asc(holidays.date));

  const scopeRows = await db
    .select()
    .from(holidayCalendarScope)
    .where(eq(holidayCalendarScope.calendarId, calendarId))
    .orderBy(asc(holidayCalendarScope.priority));

  // All holidays linked to this team via holiday_team_links (the canonical
  // source after M-policy).
  const linkedRows = await db
    .select({ holidayId: holidayTeamLinks.holidayId })
    .from(holidayTeamLinks)
    .where(eq(holidayTeamLinks.calendarId, calendarId));

  return {
    id: cal.id,
    name: cal.name,
    description: cal.description,
    status: cal.status,
    createdBy: cal.createdBy,
    createdAt: cal.createdAt,
    updatedAt: cal.updatedAt,
    holidays: holidayRows.map((h) => ({
      id: h.id,
      // drizzle returns date columns as strings (YYYY-MM-DD); guard anyway.
      date:
        typeof h.date === "string"
          ? h.date
          : new Date(h.date as unknown as string).toISOString().slice(0, 10),
      name: h.name,
      type: h.type,
      isHalfDay: h.isHalfDay,
      description: h.description,
      scope: Array.isArray(h.scope) ? h.scope : [],
    })),
    scope: scopeRows.map((s) => ({
      id: s.id,
      scopeType: s.scopeType as ScopeType,
      scopeId: s.scopeId,
      priority: s.priority,
    })),
    holidayIds: linkedRows.map((r) => r.holidayId),
  };
}

// ───── routes ─────────────────────────────────────────────────────────────

// GET /api/admin/holiday-calendars
//   List calendars. Status filter optional via ?status=Published.
adminHolidayCalendarsRouter.get("/", async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : null;

    const rows = await db
      .select()
      .from(holidayCalendars)
      .where(
        statusFilter
          ? eq(holidayCalendars.status, statusFilter)
          : undefined,
      )
      .orderBy(desc(holidayCalendars.updatedAt));

    // Annotate each calendar with a holidayCount for the list view.
    const calendarsWithCount = await Promise.all(
      rows.map(async (c) => {
        const holidayRows = await db
          .select({ id: holidays.id })
          .from(holidays)
          .where(eq(holidays.calendarId, c.id));
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          status: c.status,
          holidayCount: holidayRows.length,
          updatedAt: c.updatedAt,
        };
      }),
    );

    res.json({ data: calendarsWithCount });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/holiday-calendars/:id  →  full bundle with holidays + scope.
adminHolidayCalendarsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const full = await loadFullCalendar(id);
    if (!full) {
      throw new ApiError(404, "NOT_FOUND", "Calendar not found.");
    }
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/holiday-calendars  →  create calendar + holidays + scope in one tx.
adminHolidayCalendarsRouter.post("/", async (req, res, next) => {
  try {
    const body = calendarUpsertSchema.parse(req.body);

    const createdId = await db.transaction(async (tx) => {
      const [cal] = await tx
        .insert(holidayCalendars)
        .values({
          name: body.name,
          description: body.description ?? null,
          status: body.status,
        })
        .returning({ id: holidayCalendars.id });
      if (!cal) {
        throw new ApiError(500, "INSERT_FAILED", "Calendar insert returned no row.");
      }

      if (body.holidays.length > 0) {
        await tx.insert(holidays).values(
          body.holidays.map((h) => ({
            calendarId: cal.id,
            date: h.date,
            name: h.name,
            type: h.type,
            isHalfDay: h.isHalfDay,
            description: h.description ?? null,
            scope: h.scope,
          })),
        );
      }

      if (body.scope.length > 0) {
        await tx.insert(holidayCalendarScope).values(
          body.scope.map((s) => ({
            calendarId: cal.id,
            scopeType: s.scopeType,
            scopeId: s.scopeId ?? null,
            priority: s.priority,
          })),
        );
      }

      if (body.holidayIds.length > 0) {
        await tx
          .insert(holidayTeamLinks)
          .values(
            body.holidayIds.map((holidayId) => ({
              holidayId,
              calendarId: cal.id,
            })),
          )
          .onConflictDoNothing();
      }

      return cal.id;
    });

    const full = await loadFullCalendar(createdId);
    res.status(201).json({ data: full });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/holiday_calendars_name_unique/i.test(msg)) {
      next(new ApiError(409, "DUPLICATE", "A calendar with this name already exists."));
      return;
    }
    next(e);
  }
});

// PATCH /api/admin/holiday-calendars/:id  →  partial update; replaces holidays/scope arrays when supplied.
adminHolidayCalendarsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = calendarPatchSchema.parse(req.body);

    await db.transaction(async (tx) => {
      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) {
        updates.description = body.description ?? null;
      }
      if (body.status !== undefined) updates.status = body.status;

      if (Object.keys(updates).length > 0) {
        const [row] = await tx
          .update(holidayCalendars)
          .set(updates)
          .where(eq(holidayCalendars.id, id))
          .returning({ id: holidayCalendars.id });
        if (!row) {
          throw new ApiError(404, "NOT_FOUND", "Calendar not found.");
        }
      } else {
        const [exists] = await tx
          .select({ id: holidayCalendars.id })
          .from(holidayCalendars)
          .where(eq(holidayCalendars.id, id))
          .limit(1);
        if (!exists) {
          throw new ApiError(404, "NOT_FOUND", "Calendar not found.");
        }
      }

      if (body.holidays !== undefined) {
        await tx.delete(holidays).where(eq(holidays.calendarId, id));
        if (body.holidays.length > 0) {
          await tx.insert(holidays).values(
            body.holidays.map((h) => ({
              calendarId: id,
              date: h.date,
              name: h.name,
              type: h.type,
              isHalfDay: h.isHalfDay,
              description: h.description ?? null,
              scope: h.scope,
            })),
          );
        }
      }

      if (body.scope !== undefined) {
        await tx
          .delete(holidayCalendarScope)
          .where(eq(holidayCalendarScope.calendarId, id));
        if (body.scope.length > 0) {
          await tx.insert(holidayCalendarScope).values(
            body.scope.map((s) => ({
              calendarId: id,
              scopeType: s.scopeType,
              scopeId: s.scopeId ?? null,
              priority: s.priority,
            })),
          );
        }
      }

      if (body.holidayIds !== undefined) {
        // Replace this team's holiday links with the new set.
        await tx
          .delete(holidayTeamLinks)
          .where(eq(holidayTeamLinks.calendarId, id));
        if (body.holidayIds.length > 0) {
          await tx
            .insert(holidayTeamLinks)
            .values(
              body.holidayIds.map((holidayId) => ({
                holidayId,
                calendarId: id,
              })),
            )
            .onConflictDoNothing();
        }
      }
    });

    const full = await loadFullCalendar(id);
    res.json({ data: full });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/holiday_calendars_name_unique/i.test(msg)) {
      next(new ApiError(409, "DUPLICATE", "A calendar with this name already exists."));
      return;
    }
    next(e);
  }
});

// DELETE /api/admin/holiday-calendars/:id  →  cascades to holidays + scope.
adminHolidayCalendarsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const [row] = await db
      .delete(holidayCalendars)
      .where(eq(holidayCalendars.id, id))
      .returning({ id: holidayCalendars.id });
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Calendar not found.");
    }
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
});
