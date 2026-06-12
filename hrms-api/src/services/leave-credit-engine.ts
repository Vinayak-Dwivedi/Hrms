// Leave credit engine (M6).
//
// Two flavours of credit:
//   - Monthly accrual    e.g. CL = 1/month → run on the 1st of every month
//   - Yearly grant       e.g. EL = 15/Jan → run once per year
//
// Accrual configuration lives on each leave_policy's settings JSONB at the
// `accrual` key:
//
//   {
//     "accrual": {
//       "frequency":       "Monthly" | "Yearly" | "None",
//       "monthlyAmount":   1,          // required when frequency=Monthly
//       "yearlyAmount":    15,         // required when frequency=Yearly
//       "yearlyGrantMonth": 1          // 1-12, required when frequency=Yearly (default 1)
//     }
//   }
//
// The engine is idempotent: each (employee, leaveType, period, kind) row in
// leave_credit_transactions is uniquely indexed for kinds Accrual/Grant, so
// re-running for the same period silently skips employees who already got
// the credit. This lets ops re-run safely if a cron failed halfway through.

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  leaveBalances,
  leaveCreditTransactions,
  leavePolicies,
  leaveTypes,
} from "@/db/schema/hrms";
import { resolvePolicyForEmployee } from "@/services/leave-policy-resolver";

export type CreditKind =
  | "Accrual"
  | "Grant"
  | "Adjustment"
  | "CarryForward"
  | "Lapse"
  | "Encashment";

export interface AccrualConfig {
  frequency: "Monthly" | "Yearly" | "None";
  monthlyAmount?: number;
  yearlyAmount?: number;
  yearlyGrantMonth?: number;
}

function readAccrualConfig(
  settings: Record<string, unknown> | null | undefined,
): AccrualConfig | null {
  if (!settings) return null;
  const accrual = settings.accrual as Record<string, unknown> | undefined;
  if (!accrual) return null;
  const freq = accrual.frequency as string | undefined;
  if (freq !== "Monthly" && freq !== "Yearly" && freq !== "None") return null;
  return {
    frequency: freq,
    monthlyAmount:
      typeof accrual.monthlyAmount === "number" && accrual.monthlyAmount > 0
        ? accrual.monthlyAmount
        : undefined,
    yearlyAmount:
      typeof accrual.yearlyAmount === "number" && accrual.yearlyAmount > 0
        ? accrual.yearlyAmount
        : undefined,
    yearlyGrantMonth:
      typeof accrual.yearlyGrantMonth === "number"
        ? Math.min(12, Math.max(1, Math.floor(accrual.yearlyGrantMonth)))
        : 1,
  };
}

interface CreditAttempt {
  employeeId: number;
  leaveTypeId: number;
  policyId: number | null;
  amount: number;
  kind: CreditKind;
  period: string;
  reason: string;
  actorUserId: string | null;
}

export interface CreditRunSummary {
  attempted: number;
  applied: number;
  skipped: number;
  errors: number;
  // First 20 sampled errors for triage; full list lives in pm2 logs.
  errorSamples: Array<{ employeeId: number; leaveTypeId: number; error: string }>;
}

/** Insert a credit transaction + bump the matching leave_balances row in one
 *  transaction. Returns true if applied; false if a duplicate already exists
 *  for this (employee, type, period, kind). Throws on actual errors. */
async function applyCredit(c: CreditAttempt): Promise<"applied" | "skipped"> {
  return db.transaction(async (tx) => {
    // Step 1 — insert the ledger row; ON CONFLICT swallows duplicates.
    const inserted = await tx
      .insert(leaveCreditTransactions)
      .values({
        employeeId: c.employeeId,
        leaveTypeId: c.leaveTypeId,
        policyId: c.policyId,
        amount: String(c.amount),
        kind: c.kind,
        period: c.period,
        reason: c.reason,
        actorUserId: c.actorUserId,
      })
      .onConflictDoNothing({
        target: [
          leaveCreditTransactions.employeeId,
          leaveCreditTransactions.leaveTypeId,
          leaveCreditTransactions.period,
          leaveCreditTransactions.kind,
        ],
      })
      .returning({ id: leaveCreditTransactions.id });

    if (inserted.length === 0) return "skipped";

    // Step 2 — upsert the balance row.
    const existing = await tx
      .select({
        accrued: leaveBalances.accrued,
        closing: leaveBalances.closingBalance,
      })
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.employeeId, c.employeeId),
          eq(leaveBalances.leaveTypeId, c.leaveTypeId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      // First credit for this (employee, type) — create the row.
      await tx.insert(leaveBalances).values({
        employeeId: c.employeeId,
        leaveTypeId: c.leaveTypeId,
        openingBalance: "0",
        accrued: String(c.amount),
        used: "0",
        carriedForward: "0",
        closingBalance: String(c.amount),
      });
    } else {
      const newAccrued = Number(existing[0]!.accrued) + c.amount;
      const newClosing = Number(existing[0]!.closing) + c.amount;
      await tx
        .update(leaveBalances)
        .set({
          accrued: String(newAccrued),
          closingBalance: String(newClosing),
        })
        .where(
          and(
            eq(leaveBalances.employeeId, c.employeeId),
            eq(leaveBalances.leaveTypeId, c.leaveTypeId),
          ),
        );
    }
    return "applied";
  });
}

/** Manually credit a fixed amount of one leave type to every active employee
 *  in a Department or Sub-Department. Idempotent per (employee, type, period,
 *  kind=Adjustment): re-running the same period skips already-credited staff,
 *  so you can't accidentally double-credit. */
export async function runManualCredit(opts: {
  leaveTypeId: number;
  amount: number;
  scopeType: "Department" | "SubDepartment";
  scopeId: number;
  period: string;
  reason: string;
  actorUserId: string | null;
}): Promise<{ applied: number; skipped: number; total: number }> {
  const col =
    opts.scopeType === "Department"
      ? employees.departmentId
      : employees.subDepartmentId;
  const emps = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        inArray(employees.employeeStatus, ["Active", "Probation", "Notice"]),
        eq(col, opts.scopeId),
      ),
    );

  let applied = 0;
  let skipped = 0;
  for (const e of emps) {
    const r = await applyCredit({
      employeeId: e.id,
      leaveTypeId: opts.leaveTypeId,
      policyId: null,
      amount: opts.amount,
      kind: "Adjustment",
      period: opts.period,
      reason: opts.reason,
      actorUserId: opts.actorUserId,
    });
    if (r === "applied") applied += 1;
    else skipped += 1;
  }
  return { applied, skipped, total: emps.length };
}

interface RunOptions {
  /** Restrict to specific employees (testing, partial backfill). */
  employeeIds?: number[];
  /** When true, log what would happen without writing. */
  dryRun?: boolean;
  /** User-id stamp on each credit row for audit. */
  actorUserId?: string | null;
}

async function loadEligibleEmployees(
  employeeIds?: number[],
): Promise<Array<{ id: number }>> {
  // Probation and Notice are still eligible — they accrue normally. Only
  // "Inactive" and "Exited" are excluded.
  const whereClauses = [
    inArray(employees.employeeStatus, ["Active", "Probation", "Notice"]),
  ];
  if (employeeIds && employeeIds.length > 0) {
    whereClauses.push(inArray(employees.id, employeeIds));
  }
  return db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...whereClauses));
}

async function loadActiveLeaveTypes(): Promise<
  Array<{ id: number; code: string; name: string }>
> {
  return db
    .select({ id: leaveTypes.id, code: leaveTypes.code, name: leaveTypes.name })
    .from(leaveTypes)
    .where(eq(leaveTypes.isActive, true));
}

/** Run monthly accrual for every (employee, leaveType) whose resolved policy
 *  has accrual.frequency=Monthly. `period` is YYYY-MM (defaults to current
 *  calendar month in UTC). */
export async function runMonthlyAccrual(
  period?: string,
  opts: RunOptions = {},
): Promise<CreditRunSummary> {
  const now = new Date();
  const periodStr =
    period ??
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const [emps, types] = await Promise.all([
    loadEligibleEmployees(opts.employeeIds),
    loadActiveLeaveTypes(),
  ]);

  const summary: CreditRunSummary = {
    attempted: 0,
    applied: 0,
    skipped: 0,
    errors: 0,
    errorSamples: [],
  };

  for (const emp of emps) {
    for (const type of types) {
      summary.attempted++;
      try {
        const resolved = await resolvePolicyForEmployee(emp.id, {
          id: type.id,
        });
        if (!resolved?.policy) {
          summary.skipped++;
          continue;
        }
        const accrual = readAccrualConfig(
          resolved.policy.settings as Record<string, unknown>,
        );
        if (
          !accrual ||
          accrual.frequency !== "Monthly" ||
          !accrual.monthlyAmount
        ) {
          summary.skipped++;
          continue;
        }
        if (opts.dryRun) {
          summary.applied++;
          continue;
        }
        const result = await applyCredit({
          employeeId: emp.id,
          leaveTypeId: type.id,
          policyId: resolved.policy.id,
          amount: accrual.monthlyAmount,
          kind: "Accrual",
          period: periodStr,
          reason: `Monthly accrual for ${type.code} (${periodStr})`,
          actorUserId: opts.actorUserId ?? null,
        });
        if (result === "applied") summary.applied++;
        else summary.skipped++;
      } catch (err) {
        summary.errors++;
        if (summary.errorSamples.length < 20) {
          summary.errorSamples.push({
            employeeId: emp.id,
            leaveTypeId: type.id,
            error: (err as Error).message,
          });
        }
        console.error(
          `[credit-engine] accrual failed for emp=${emp.id} type=${type.id}:`,
          err,
        );
      }
    }
  }

  return summary;
}

/** Run yearly grants for `year` (defaults to current UTC year). Only
 *  policies whose accrual.yearlyGrantMonth matches the current month are
 *  granted, so calling on Jan 1 only fires January-month grants. Pass
 *  `forceMonth` to override that gate (e.g. backfilling a missed run). */
export async function runYearlyGrant(
  year?: number,
  opts: RunOptions & { forceMonth?: number } = {},
): Promise<CreditRunSummary> {
  const now = new Date();
  const yearNum = year ?? now.getUTCFullYear();
  const targetMonth = opts.forceMonth ?? now.getUTCMonth() + 1;
  const periodStr = `${yearNum}-${String(targetMonth).padStart(2, "0")}`;

  const [emps, types] = await Promise.all([
    loadEligibleEmployees(opts.employeeIds),
    loadActiveLeaveTypes(),
  ]);

  const summary: CreditRunSummary = {
    attempted: 0,
    applied: 0,
    skipped: 0,
    errors: 0,
    errorSamples: [],
  };

  for (const emp of emps) {
    for (const type of types) {
      summary.attempted++;
      try {
        const resolved = await resolvePolicyForEmployee(emp.id, {
          id: type.id,
        });
        if (!resolved?.policy) {
          summary.skipped++;
          continue;
        }
        const accrual = readAccrualConfig(
          resolved.policy.settings as Record<string, unknown>,
        );
        if (
          !accrual ||
          accrual.frequency !== "Yearly" ||
          !accrual.yearlyAmount
        ) {
          summary.skipped++;
          continue;
        }
        const grantMonth = accrual.yearlyGrantMonth ?? 1;
        if (grantMonth !== targetMonth) {
          summary.skipped++;
          continue;
        }
        if (opts.dryRun) {
          summary.applied++;
          continue;
        }
        const result = await applyCredit({
          employeeId: emp.id,
          leaveTypeId: type.id,
          policyId: resolved.policy.id,
          amount: accrual.yearlyAmount,
          kind: "Grant",
          period: periodStr,
          reason: `Yearly grant for ${type.code} (${periodStr})`,
          actorUserId: opts.actorUserId ?? null,
        });
        if (result === "applied") summary.applied++;
        else summary.skipped++;
      } catch (err) {
        summary.errors++;
        if (summary.errorSamples.length < 20) {
          summary.errorSamples.push({
            employeeId: emp.id,
            leaveTypeId: type.id,
            error: (err as Error).message,
          });
        }
        console.error(
          `[credit-engine] grant failed for emp=${emp.id} type=${type.id}:`,
          err,
        );
      }
    }
  }

  return summary;
}

export interface CreditTransactionRow {
  id: number;
  employeeId: number;
  employeeName: string | null;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  policyId: number | null;
  amount: number;
  kind: string;
  period: string;
  reason: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export async function listCreditTransactions(opts: {
  employeeId?: number;
  leaveTypeId?: number;
  period?: string;
  limit?: number;
}): Promise<CreditTransactionRow[]> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const conds = [];
  if (opts.employeeId)
    conds.push(eq(leaveCreditTransactions.employeeId, opts.employeeId));
  if (opts.leaveTypeId)
    conds.push(eq(leaveCreditTransactions.leaveTypeId, opts.leaveTypeId));
  if (opts.period) conds.push(eq(leaveCreditTransactions.period, opts.period));

  const rows = await db
    .select({
      id: leaveCreditTransactions.id,
      employeeId: leaveCreditTransactions.employeeId,
      empFirst: employees.firstName,
      empLast: employees.lastName,
      leaveTypeId: leaveCreditTransactions.leaveTypeId,
      leaveTypeCode: leaveTypes.code,
      leaveTypeName: leaveTypes.name,
      policyId: leaveCreditTransactions.policyId,
      amount: leaveCreditTransactions.amount,
      kind: leaveCreditTransactions.kind,
      period: leaveCreditTransactions.period,
      reason: leaveCreditTransactions.reason,
      actorUserId: leaveCreditTransactions.actorUserId,
      createdAt: leaveCreditTransactions.createdAt,
    })
    .from(leaveCreditTransactions)
    .innerJoin(employees, eq(leaveCreditTransactions.employeeId, employees.id))
    .innerJoin(
      leaveTypes,
      eq(leaveCreditTransactions.leaveTypeId, leaveTypes.id),
    )
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(sql`${leaveCreditTransactions.createdAt} DESC`)
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: [r.empFirst, r.empLast].filter(Boolean).join(" ") || null,
    leaveTypeId: r.leaveTypeId,
    leaveTypeCode: r.leaveTypeCode,
    leaveTypeName: r.leaveTypeName,
    policyId: r.policyId,
    amount: Number(r.amount),
    kind: r.kind,
    period: r.period,
    reason: r.reason,
    actorUserId: r.actorUserId,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));
}

/** List of policies that have accrual configured — useful for the admin
 *  page to preview what will happen on the next run. */
export interface AccrualPolicySummary {
  policyId: number;
  policyName: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  config: AccrualConfig;
}

export async function listAccrualPolicies(): Promise<AccrualPolicySummary[]> {
  const rows = await db
    .select({
      policyId: leavePolicies.id,
      policyName: leavePolicies.name,
      settings: leavePolicies.settings,
      leaveTypeId: leaveTypes.id,
      leaveTypeCode: leaveTypes.code,
      leaveTypeName: leaveTypes.name,
    })
    .from(leavePolicies)
    .innerJoin(leaveTypes, eq(leavePolicies.leaveTypeId, leaveTypes.id))
    .where(eq(leavePolicies.status, "Active"));

  return rows
    .map((r) => {
      const config = readAccrualConfig(
        r.settings as Record<string, unknown>,
      );
      if (!config || config.frequency === "None") return null;
      return {
        policyId: r.policyId,
        policyName: r.policyName,
        leaveTypeId: r.leaveTypeId,
        leaveTypeCode: r.leaveTypeCode,
        leaveTypeName: r.leaveTypeName,
        config,
      };
    })
    .filter((x): x is AccrualPolicySummary => x !== null);
}
