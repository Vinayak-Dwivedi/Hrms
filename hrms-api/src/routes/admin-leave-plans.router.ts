// Admin CRUD for Leave Plans (Phase 4 "Leave Policies"). Mounted at
// /api/admin/leave-plans.
//
// A leave plan bundles: per-leave-type annual quotas, an optional weekly-off
// config link, a comp-off toggle, and a scope (who it applies to). When a plan
// is Active, saving it auto-seeds leave_balances for every matched employee so
// the quotas show up in Apply-Leave.
//
// Plan metadata + allocations + scope all save in one transaction.

import { Router } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  leaveBalances,
  leavePlanAllocations,
  leavePlans,
  leavePlanScope,
  leaveTypes,
  weeklyOffConfigs,
} from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";
import {
  employeeMatchesHierarchyScope,
  loadAllEmployeeScopeDimensions,
} from "@/services/employee-scope-dimensions";

export const adminLeavePlansRouter: Router = Router();

const HIERARCHY_SCOPE_TYPES = [
  "Company",
  "Branch",
  "Department",
  "SubDepartment",
] as const;

const allocationSchema = z.object({
  leaveTypeId: z.number().int().positive(),
  annualQuota: z.coerce.number().min(0).max(366),
});

const scopeRowSchema = z.object({
  scopeType: z.enum(HIERARCHY_SCOPE_TYPES),
  scopeId: z.number().int().positive().nullable().optional(),
  priority: z.number().int().min(0).default(100),
});

const upsertSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["Draft", "Active", "Archived"]).default("Draft"),
  isDefault: z.boolean().default(false),
  weeklyOffConfigId: z.number().int().positive().nullable().optional(),
  compOffEnabled: z.boolean().default(false),
  accrualMethod: z.enum(["Annual", "Monthly"]).default("Annual"),
  carryForwardCap: z.number().int().min(0).max(366).nullable().optional(),
  proRataJoiners: z.boolean().default(false),
  approvalWorkflowId: z.number().int().positive().nullable().optional(),
  allocations: z.array(allocationSchema).default([]),
  scope: z.array(scopeRowSchema).default([]),
});

// NOT upsertSchema.partial() — that keeps the .default()s, so omitting a field
// (e.g. status/scope) would silently reset it. Patch fields are plain optional.
const patchSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["Draft", "Active", "Archived"]).optional(),
  isDefault: z.boolean().optional(),
  weeklyOffConfigId: z.number().int().positive().nullable().optional(),
  compOffEnabled: z.boolean().optional(),
  accrualMethod: z.enum(["Annual", "Monthly"]).optional(),
  carryForwardCap: z.number().int().min(0).max(366).nullable().optional(),
  proRataJoiners: z.boolean().optional(),
  approvalWorkflowId: z.number().int().positive().nullable().optional(),
  allocations: z.array(allocationSchema).optional(),
  scope: z.array(scopeRowSchema).optional(),
});

// ───── shape helpers ──────────────────────────────────────────────────────

async function loadFullPlan(planId: number) {
  const [plan] = await db
    .select()
    .from(leavePlans)
    .where(eq(leavePlans.id, planId))
    .limit(1);
  if (!plan) return null;

  const allocs = await db
    .select({
      id: leavePlanAllocations.id,
      leaveTypeId: leavePlanAllocations.leaveTypeId,
      annualQuota: leavePlanAllocations.annualQuota,
      code: leaveTypes.code,
      typeName: leaveTypes.name,
    })
    .from(leavePlanAllocations)
    .innerJoin(leaveTypes, eq(leavePlanAllocations.leaveTypeId, leaveTypes.id))
    .where(eq(leavePlanAllocations.planId, planId))
    .orderBy(asc(leaveTypes.name));

  const scopeRows = await db
    .select()
    .from(leavePlanScope)
    .where(eq(leavePlanScope.planId, planId))
    .orderBy(asc(leavePlanScope.priority));

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    status: plan.status,
    isDefault: plan.isDefault,
    weeklyOffConfigId: plan.weeklyOffConfigId,
    compOffEnabled: plan.compOffEnabled,
    accrualMethod: plan.accrualMethod,
    carryForwardCap: plan.carryForwardCap,
    proRataJoiners: plan.proRataJoiners,
    approvalWorkflowId: plan.approvalWorkflowId,
    createdBy: plan.createdBy,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    allocations: allocs.map((a) => ({
      leaveTypeId: a.leaveTypeId,
      code: a.code,
      typeName: a.typeName,
      annualQuota: Number(a.annualQuota),
    })),
    scope: scopeRows.map((s) => ({
      id: s.id,
      scopeType: s.scopeType,
      scopeId: s.scopeId,
      priority: s.priority,
    })),
  };
}

interface MatchedEmployee {
  id: number;
  joiningDate: string | null;
}

// Match the plan's scope rows against every employee. Company scope is a
// wildcard (everyone). Branch / Department / SubDepartment use AND semantics
// across dimension groups (see employeeMatchesHierarchyScope).
async function matchedEmployees(
  scope: { scopeType: string; scopeId: number | null }[],
): Promise<MatchedEmployee[]> {
  if (scope.length === 0) return [];
  const emps = await loadAllEmployeeScopeDimensions();
  const out: MatchedEmployee[] = [];
  for (const e of emps) {
    if (employeeMatchesHierarchyScope(e, scope)) {
      out.push({ id: e.id, joiningDate: e.joiningDate });
    }
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Given a base annual quota + the plan's accrual/pro-rata flags + the
// employee's join date, compute the { opening, accrued } to seed *now*.
function effectiveBalance(
  baseQuota: number,
  accrualMethod: string,
  proRata: boolean,
  joiningDate: string | null,
  now: Date,
): { opening: number; accrued: number } {
  const curYear = now.getFullYear();
  const curMonth1 = now.getMonth() + 1; // 1..12

  let effective = baseQuota;
  if (proRata && joiningDate) {
    const jd = new Date(`${joiningDate}T00:00:00`);
    if (jd.getFullYear() === curYear) {
      // Fraction of the year remaining from the join month (inclusive).
      const monthsActive = 12 - jd.getMonth();
      effective = round2((baseQuota * monthsActive) / 12);
    }
  }

  if (accrualMethod === "Monthly") {
    // Accrued up to the current month; opening starts at 0.
    return { opening: 0, accrued: round2((effective * curMonth1) / 12) };
  }
  return { opening: effective, accrued: 0 };
}

// Seed/refresh leave_balances for every matched employee × allocation. On
// conflict it UPDATES opening + accrued and recomputes closing from the
// employee's existing carried/used (clamped >= 0) — so editing a plan's quota
// re-flows to assigned employees without wiping their usage.
async function seedBalancesForPlan(planId: number): Promise<number> {
  const full = await loadFullPlan(planId);
  if (!full || full.status !== "Active") return 0;
  if (full.allocations.length === 0) return 0;

  const emps = await matchedEmployees(full.scope);
  if (emps.length === 0) return 0;

  const now = new Date();
  const rows = emps.flatMap((e) =>
    full.allocations.map((a) => {
      const { opening, accrued } = effectiveBalance(
        a.annualQuota,
        full.accrualMethod,
        full.proRataJoiners,
        e.joiningDate,
        now,
      );
      return {
        employeeId: e.id,
        leaveTypeId: a.leaveTypeId,
        openingBalance: String(opening),
        accrued: String(accrued),
        used: "0",
        carriedForward: "0",
        collapsed: false,
        closingBalance: String(opening + accrued),
      };
    }),
  );

  let affected = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await db
      .insert(leaveBalances)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: [leaveBalances.employeeId, leaveBalances.leaveTypeId],
        set: {
          openingBalance: sql`excluded.opening_balance`,
          accrued: sql`excluded.accrued`,
          // Recompute closing from the proposed opening/accrued plus the row's
          // existing carry-forward minus usage; never let it go negative.
          closingBalance: sql`GREATEST(0, excluded.opening_balance + excluded.accrued + ${leaveBalances.carriedForward} - ${leaveBalances.used})`,
        },
      })
      .returning({ employeeId: leaveBalances.employeeId });
    affected += res.length;
  }
  return affected;
}

// ───── routes ─────────────────────────────────────────────────────────────

adminLeavePlansRouter.get("/", async (req, res, next) => {
  try {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : null;
    const plans = await db
      .select()
      .from(leavePlans)
      .where(statusFilter ? eq(leavePlans.status, statusFilter) : undefined)
      .orderBy(desc(leavePlans.updatedAt));

    // Allocation counts per plan (cheap summary for the list view).
    const allocs = await db
      .select({
        planId: leavePlanAllocations.planId,
        leaveTypeId: leavePlanAllocations.leaveTypeId,
        annualQuota: leavePlanAllocations.annualQuota,
        code: leaveTypes.code,
      })
      .from(leavePlanAllocations)
      .innerJoin(
        leaveTypes,
        eq(leavePlanAllocations.leaveTypeId, leaveTypes.id),
      );
    const byPlan = new Map<number, { code: string; annualQuota: number }[]>();
    for (const a of allocs) {
      const list = byPlan.get(a.planId) ?? [];
      list.push({ code: a.code, annualQuota: Number(a.annualQuota) });
      byPlan.set(a.planId, list);
    }

    res.json({
      data: plans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        isDefault: p.isDefault,
        weeklyOffConfigId: p.weeklyOffConfigId,
        compOffEnabled: p.compOffEnabled,
        updatedAt: p.updatedAt,
        allocations: byPlan.get(p.id) ?? [],
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminLeavePlansRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const full = await loadFullPlan(id);
    if (!full) throw new ApiError(404, "NOT_FOUND", "Leave plan not found.");
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});

adminLeavePlansRouter.post("/", async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);

    const createdId = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(leavePlans)
        .values({
          name: body.name,
          description: body.description ?? null,
          status: body.status,
          isDefault: body.isDefault,
          weeklyOffConfigId: body.weeklyOffConfigId ?? null,
          compOffEnabled: body.compOffEnabled,
          accrualMethod: body.accrualMethod,
          carryForwardCap: body.carryForwardCap ?? null,
          proRataJoiners: body.proRataJoiners,
          approvalWorkflowId: body.approvalWorkflowId ?? null,
        })
        .returning({ id: leavePlans.id });
      if (!plan) {
        throw new ApiError(500, "INSERT_FAILED", "Insert returned no row.");
      }
      if (body.allocations.length > 0) {
        await tx.insert(leavePlanAllocations).values(
          body.allocations.map((a) => ({
            planId: plan.id,
            leaveTypeId: a.leaveTypeId,
            annualQuota: String(a.annualQuota),
          })),
        );
      }
      if (body.scope.length > 0) {
        await tx.insert(leavePlanScope).values(
          body.scope.map((s) => ({
            planId: plan.id,
            scopeType: s.scopeType,
            scopeId: s.scopeId ?? null,
            priority: s.priority,
          })),
        );
      }
      return plan.id;
    });

    const seeded = await seedBalancesForPlan(createdId);
    const full = await loadFullPlan(createdId);
    res.status(201).json({ data: full, meta: { balancesSeeded: seeded } });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/leave_plans_name_unique|leave_plans_name_key/i.test(msg)) {
      next(new ApiError(409, "DUPLICATE", "A plan with this name already exists."));
      return;
    }
    next(e);
  }
});

adminLeavePlansRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = patchSchema.parse(req.body);

    await db.transaction(async (tx) => {
      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) {
        updates.description = body.description ?? null;
      }
      if (body.status !== undefined) updates.status = body.status;
      if (body.isDefault !== undefined) updates.isDefault = body.isDefault;
      if (body.weeklyOffConfigId !== undefined) {
        updates.weeklyOffConfigId = body.weeklyOffConfigId ?? null;
      }
      if (body.compOffEnabled !== undefined) {
        updates.compOffEnabled = body.compOffEnabled;
      }
      if (body.accrualMethod !== undefined) {
        updates.accrualMethod = body.accrualMethod;
      }
      if (body.carryForwardCap !== undefined) {
        updates.carryForwardCap = body.carryForwardCap ?? null;
      }
      if (body.proRataJoiners !== undefined) {
        updates.proRataJoiners = body.proRataJoiners;
      }
      if (body.approvalWorkflowId !== undefined) {
        updates.approvalWorkflowId = body.approvalWorkflowId ?? null;
      }

      if (Object.keys(updates).length > 0) {
        const [row] = await tx
          .update(leavePlans)
          .set(updates)
          .where(eq(leavePlans.id, id))
          .returning({ id: leavePlans.id });
        if (!row) throw new ApiError(404, "NOT_FOUND", "Leave plan not found.");
      } else {
        const [exists] = await tx
          .select({ id: leavePlans.id })
          .from(leavePlans)
          .where(eq(leavePlans.id, id))
          .limit(1);
        if (!exists) throw new ApiError(404, "NOT_FOUND", "Leave plan not found.");
      }

      if (body.allocations !== undefined) {
        await tx
          .delete(leavePlanAllocations)
          .where(eq(leavePlanAllocations.planId, id));
        if (body.allocations.length > 0) {
          await tx.insert(leavePlanAllocations).values(
            body.allocations.map((a) => ({
              planId: id,
              leaveTypeId: a.leaveTypeId,
              annualQuota: String(a.annualQuota),
            })),
          );
        }
      }

      if (body.scope !== undefined) {
        await tx.delete(leavePlanScope).where(eq(leavePlanScope.planId, id));
        if (body.scope.length > 0) {
          await tx.insert(leavePlanScope).values(
            body.scope.map((s) => ({
              planId: id,
              scopeType: s.scopeType,
              scopeId: s.scopeId ?? null,
              priority: s.priority,
            })),
          );
        }
      }
    });

    const seeded = await seedBalancesForPlan(id);
    const full = await loadFullPlan(id);
    res.json({ data: full, meta: { balancesSeeded: seeded } });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/leave_plans_name_unique|leave_plans_name_key/i.test(msg)) {
      next(new ApiError(409, "DUPLICATE", "A plan with this name already exists."));
      return;
    }
    next(e);
  }
});

adminLeavePlansRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const [row] = await db
      .update(leavePlans)
      .set({ status: "Archived" })
      .where(eq(leavePlans.id, id))
      .returning({ id: leavePlans.id });
    if (!row) throw new ApiError(404, "NOT_FOUND", "Leave plan not found.");
    const full = await loadFullPlan(id);
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});
