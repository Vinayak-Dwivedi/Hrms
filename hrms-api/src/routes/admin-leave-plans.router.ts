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
import { asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  branches,
  leaveBalances,
  leavePlanAllocations,
  leavePlans,
  leavePlanScope,
  leaveTypes,
  orgHierarchyDepartmentBranches,
  orgHierarchyDepartments,
  orgHierarchySubDepartments,
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

// ───── Leave Policy grid (scope-first allocation matrix) ───────────────────
//
// The grid presents the Location → Department → Sub-department tree and lets
// the admin set per-leave-type annual allocations + a weekly-off pattern inline
// for each org leaf. Each leaf maps to a single leave_plan tagged with a
// `grid_scope_key` ("B2:D3:S5" / "B2:D3") whose composite scope (Branch ∧
// Department ∧ SubDepartment) matches exactly the employees in that unit.
// Filling a cell upserts the plan (Active) and reflows leave_balances.

function buildScopeKey(
  branchId: number,
  departmentId: number,
  subDepartmentId: number | null,
): string {
  return subDepartmentId != null
    ? `B${branchId}:D${departmentId}:S${subDepartmentId}`
    : `B${branchId}:D${departmentId}`;
}

adminLeavePlansRouter.get("/grid", async (_req, res, next) => {
  try {
    const [types, weeklyOffs, branchRows, deptRows, subRows, deptBranchRows] =
      await Promise.all([
        db
          .select({ id: leaveTypes.id, code: leaveTypes.code, name: leaveTypes.name })
          .from(leaveTypes)
          .where(eq(leaveTypes.isActive, true))
          .orderBy(asc(leaveTypes.name)),
        db
          .select({ id: weeklyOffConfigs.id, name: weeklyOffConfigs.name })
          .from(weeklyOffConfigs)
          .orderBy(asc(weeklyOffConfigs.name)),
        db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .orderBy(asc(branches.name)),
        db
          .select({
            id: orgHierarchyDepartments.id,
            name: orgHierarchyDepartments.name,
            status: orgHierarchyDepartments.status,
          })
          .from(orgHierarchyDepartments),
        db
          .select({
            id: orgHierarchySubDepartments.id,
            name: orgHierarchySubDepartments.name,
            departmentId: orgHierarchySubDepartments.departmentId,
            status: orgHierarchySubDepartments.status,
          })
          .from(orgHierarchySubDepartments),
        db.select().from(orgHierarchyDepartmentBranches),
      ]);

    const deptById = new Map(deptRows.map((d) => [d.id, d]));
    const subsByDept = new Map<number, { id: number; name: string }[]>();
    for (const s of subRows) {
      if (s.status !== "Active") continue;
      const list = subsByDept.get(s.departmentId) ?? [];
      list.push({ id: s.id, name: s.name });
      subsByDept.set(s.departmentId, list);
    }
    const deptIdsByBranch = new Map<number, number[]>();
    for (const link of deptBranchRows) {
      const list = deptIdsByBranch.get(link.branchId) ?? [];
      list.push(link.departmentId);
      deptIdsByBranch.set(link.branchId, list);
    }

    // Departments are independent of branches in this schema; the
    // department↔branch bridge maps a department to specific locations. A
    // department with NO bridge rows means "All Locations" (the org-hierarchy
    // convention) and is allocatable at every branch. So each branch shows its
    // explicitly-bridged departments PLUS every all-locations department.
    const allActiveDeptIds = deptRows
      .filter((d) => d.status === "Active")
      .map((d) => d.id);
    const deptIdsWithAnyBridge = new Set(
      deptBranchRows.map((r) => r.departmentId),
    );
    const allLocationsDeptIds = allActiveDeptIds.filter(
      (id) => !deptIdsWithAnyBridge.has(id),
    );

    const tree = branchRows
      .map((b) => {
        const deptIds = [
          ...new Set([
            ...(deptIdsByBranch.get(b.id) ?? []),
            ...allLocationsDeptIds,
          ]),
        ];
        const departments = deptIds
          .map((id) => deptById.get(id))
          .filter((d): d is NonNullable<typeof d> => !!d && d.status === "Active")
          .sort((a, c) => a.name.localeCompare(c.name))
          .map((d) => ({
            departmentId: d.id,
            departmentName: d.name,
            subDepartments: (subsByDept.get(d.id) ?? []).sort((a, c) =>
              a.name.localeCompare(c.name),
            ),
          }));
        return { branchId: b.id, branchName: b.name, departments };
      })
      .filter((b) => b.departments.length > 0);

    // Existing grid-managed plans → cells keyed by scope key.
    const gridPlans = await db
      .select({
        id: leavePlans.id,
        key: leavePlans.gridScopeKey,
        status: leavePlans.status,
        weeklyOffConfigId: leavePlans.weeklyOffConfigId,
      })
      .from(leavePlans)
      .where(isNotNull(leavePlans.gridScopeKey));

    const planIds = gridPlans.map((p) => p.id);
    const allocRows = planIds.length
      ? await db
          .select({
            planId: leavePlanAllocations.planId,
            leaveTypeId: leavePlanAllocations.leaveTypeId,
            annualQuota: leavePlanAllocations.annualQuota,
          })
          .from(leavePlanAllocations)
          .where(inArray(leavePlanAllocations.planId, planIds))
      : [];
    const allocByPlan = new Map<number, Record<number, number>>();
    for (const a of allocRows) {
      const m = allocByPlan.get(a.planId) ?? {};
      m[a.leaveTypeId] = Number(a.annualQuota);
      allocByPlan.set(a.planId, m);
    }

    const cells: Record<
      string,
      {
        planId: number;
        weeklyOffConfigId: number | null;
        status: string;
        allocations: Record<number, number>;
      }
    > = {};
    for (const p of gridPlans) {
      if (!p.key) continue;
      cells[p.key] = {
        planId: p.id,
        weeklyOffConfigId: p.weeklyOffConfigId,
        status: p.status,
        allocations: allocByPlan.get(p.id) ?? {},
      };
    }

    res.json({ data: { leaveTypes: types, weeklyOffs, tree, cells } });
  } catch (e) {
    next(e);
  }
});

const gridUpsertSchema = z.object({
  branchId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  subDepartmentId: z.number().int().positive().nullable().optional(),
  weeklyOffConfigId: z.number().int().positive().nullable().optional(),
  allocations: z.array(allocationSchema).default([]),
});

adminLeavePlansRouter.put("/grid", async (req, res, next) => {
  try {
    const body = gridUpsertSchema.parse(req.body);
    const subId = body.subDepartmentId ?? null;
    const key = buildScopeKey(body.branchId, body.departmentId, subId);
    const woId = body.weeklyOffConfigId ?? null;
    const filled =
      body.allocations.some((a) => a.annualQuota > 0) || woId != null;

    const [existing] = await db
      .select({ id: leavePlans.id })
      .from(leavePlans)
      .where(eq(leavePlans.gridScopeKey, key))
      .limit(1);

    // A brand-new, empty cell: nothing to persist.
    if (!existing && !filled) {
      res.json({
        data: { scopeKey: key, planId: null, filled: false },
        meta: { balancesSeeded: 0 },
      });
      return;
    }

    // Human-readable name (the grid keys by scope, so the name is for the DB
    // only — suffixed with the key to satisfy the unique-name constraint).
    const [br] = await db
      .select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, body.branchId))
      .limit(1);
    const [dp] = await db
      .select({ name: orgHierarchyDepartments.name })
      .from(orgHierarchyDepartments)
      .where(eq(orgHierarchyDepartments.id, body.departmentId))
      .limit(1);
    let subName: string | null = null;
    if (subId != null) {
      const [sb] = await db
        .select({ name: orgHierarchySubDepartments.name })
        .from(orgHierarchySubDepartments)
        .where(eq(orgHierarchySubDepartments.id, subId))
        .limit(1);
      subName = sb?.name ?? null;
    }
    const label = [br?.name, dp?.name, subName].filter(Boolean).join(" · ");
    const planName = `${label} (${key})`;

    const scopeRows = [
      { scopeType: "Branch" as const, scopeId: body.branchId, priority: 10 },
      { scopeType: "Department" as const, scopeId: body.departmentId, priority: 10 },
      ...(subId != null
        ? [{ scopeType: "SubDepartment" as const, scopeId: subId, priority: 10 }]
        : []),
    ];

    const planId = await db.transaction(async (tx) => {
      let id: number;
      if (existing) {
        id = existing.id;
        await tx
          .update(leavePlans)
          .set({ name: planName, status: "Active", weeklyOffConfigId: woId })
          .where(eq(leavePlans.id, id));
        await tx
          .delete(leavePlanAllocations)
          .where(eq(leavePlanAllocations.planId, id));
        await tx.delete(leavePlanScope).where(eq(leavePlanScope.planId, id));
      } else {
        const [created] = await tx
          .insert(leavePlans)
          .values({
            name: planName,
            status: "Active",
            isDefault: false,
            weeklyOffConfigId: woId,
            compOffEnabled: false,
            accrualMethod: "Annual",
            gridScopeKey: key,
          })
          .returning({ id: leavePlans.id });
        id = created!.id;
      }
      // Store every allocation the grid sent (including zeros) so reducing a
      // quota reflows balances downward, mirroring the plan editor.
      if (body.allocations.length > 0) {
        await tx.insert(leavePlanAllocations).values(
          body.allocations.map((a) => ({
            planId: id,
            leaveTypeId: a.leaveTypeId,
            annualQuota: String(a.annualQuota),
          })),
        );
      }
      await tx.insert(leavePlanScope).values(
        scopeRows.map((s) => ({
          planId: id,
          scopeType: s.scopeType,
          scopeId: s.scopeId,
          priority: s.priority,
        })),
      );
      return id;
    });

    const seeded = await seedBalancesForPlan(planId);
    res.json({
      data: { scopeKey: key, planId, filled },
      meta: { balancesSeeded: seeded },
    });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/leave_plans_name_unique|leave_plans_name_key/i.test(msg)) {
      next(new ApiError(409, "DUPLICATE", "A plan with this name already exists."));
      return;
    }
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
