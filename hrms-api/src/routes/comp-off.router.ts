// Comp-Off workflow (Phase 14). Mounted at /api/comp-off.
//
//   Employee worked a holiday / week-off
//     → POST /requests           (raise comp-off request, status Pending)
//   Manager / HR
//     → GET  /approvals          (pending requests they can action)
//     → POST /approvals/:id/approve   (→ credits the CO leave balance)
//     → POST /approvals/:id/reject
//   Employee uses the credit later via the normal Apply-Leave flow (CO type).

import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  compOffRequests,
  employees,
  leaveBalances,
  leaveTypes,
} from "@/db/schema/hrms";
import { loadCurrentEmployee } from "@/lib/employee";
import { ApiError } from "@/middleware/error";

export const compOffRouter: Router = Router();

const createSchema = z.object({
  workedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "workedDate must be YYYY-MM-DD"),
  reason: z.string().trim().min(1).max(500),
  days: z.coerce.number().min(0.5).max(1).default(1),
});

const rejectSchema = z.object({
  remarks: z.string().trim().max(500).optional().nullable(),
});

function shape(r: typeof compOffRequests.$inferSelect, employeeName?: string) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    employeeName: employeeName ?? null,
    workedDate: r.workedDate,
    days: Number(r.days),
    reason: r.reason,
    status: r.status,
    decidedAt: r.decidedAt,
    remarks: r.remarks,
    createdAt: r.createdAt,
  };
}

// ───── employee side ──────────────────────────────────────────────────────

compOffRouter.post("/requests", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const me = await loadCurrentEmployee(req.user!.id);
    const [row] = await db
      .insert(compOffRequests)
      .values({
        employeeId: me.id,
        managerId: me.reportingManagerId ?? null,
        workedDate: body.workedDate,
        days: String(body.days),
        reason: body.reason,
      })
      .returning();
    res.status(201).json({ data: shape(row!) });
  } catch (e) {
    next(e);
  }
});

compOffRouter.get("/requests", async (req, res, next) => {
  try {
    const me = await loadCurrentEmployee(req.user!.id);
    const rows = await db
      .select()
      .from(compOffRequests)
      .where(eq(compOffRequests.employeeId, me.id))
      .orderBy(desc(compOffRequests.createdAt));
    res.json({ data: rows.map((r) => shape(r)) });
  } catch (e) {
    next(e);
  }
});

// ───── approver side (manager of the requester, or admin) ───────────────────

compOffRouter.get("/approvals", async (req, res, next) => {
  try {
    const me = await loadCurrentEmployee(req.user!.id);
    const isAdmin = req.user!.role === "admin";

    const rows = await db
      .select({
        r: compOffRequests,
        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(compOffRequests)
      .innerJoin(employees, eq(compOffRequests.employeeId, employees.id))
      .where(
        isAdmin
          ? eq(compOffRequests.status, "Pending")
          : and(
              eq(compOffRequests.status, "Pending"),
              eq(compOffRequests.managerId, me.id),
            ),
      )
      .orderBy(desc(compOffRequests.createdAt));

    res.json({
      data: rows.map(({ r, firstName, lastName }) =>
        shape(r, `${firstName} ${lastName}`),
      ),
    });
  } catch (e) {
    next(e);
  }
});

// Shared guard: load a pending request the current user is allowed to action.
async function loadActionable(reqUser: { id: string; role: string }, id: number) {
  const me = await loadCurrentEmployee(reqUser.id);
  const isAdmin = reqUser.role === "admin";
  const [row] = await db
    .select()
    .from(compOffRequests)
    .where(eq(compOffRequests.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Comp-off request not found.");
  if (row.status !== "Pending") {
    throw new ApiError(409, "ALREADY_DECIDED", `Request already ${row.status}.`);
  }
  if (!isAdmin && row.managerId !== me.id) {
    throw new ApiError(403, "NOT_APPROVER", "You can't action this request.");
  }
  return { row, deciderId: me.id };
}

compOffRouter.post("/approvals/:id/approve", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    const { row, deciderId } = await loadActionable(req.user!, id);

    // Resolve the Comp-Off leave type to credit.
    const [co] = await db
      .select({ id: leaveTypes.id })
      .from(leaveTypes)
      .where(eq(leaveTypes.code, "CO"))
      .limit(1);
    if (!co) {
      throw new ApiError(
        400,
        "NO_CO_TYPE",
        "No leave type with code 'CO' exists to credit.",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(compOffRequests)
        .set({ status: "Approved", decidedBy: deciderId, decidedAt: new Date() })
        .where(eq(compOffRequests.id, id));

      // Credit the CO balance: + days to accrued and closing (clamped >= 0).
      await tx
        .insert(leaveBalances)
        .values({
          employeeId: row.employeeId,
          leaveTypeId: co.id,
          openingBalance: "0",
          accrued: String(row.days),
          used: "0",
          carriedForward: "0",
          collapsed: false,
          closingBalance: String(row.days),
        })
        .onConflictDoUpdate({
          target: [leaveBalances.employeeId, leaveBalances.leaveTypeId],
          set: {
            accrued: sql`${leaveBalances.accrued} + ${row.days}`,
            closingBalance: sql`GREATEST(0, ${leaveBalances.closingBalance} + ${row.days})`,
          },
        });
    });

    res.json({ data: { id, status: "Approved", creditedDays: Number(row.days) } });
  } catch (e) {
    next(e);
  }
});

compOffRouter.post("/approvals/:id/reject", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    const body = rejectSchema.parse(req.body);
    const { row, deciderId } = await loadActionable(req.user!, id);
    void row;
    await db
      .update(compOffRequests)
      .set({
        status: "Rejected",
        decidedBy: deciderId,
        decidedAt: new Date(),
        remarks: body.remarks ?? null,
      })
      .where(eq(compOffRequests.id, id));
    res.json({ data: { id, status: "Rejected" } });
  } catch (e) {
    next(e);
  }
});
