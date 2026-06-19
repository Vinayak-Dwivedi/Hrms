// Leave balance usage sync (minimal direct-adjust).
//
// A leave request consumes balance exactly while its status is "Approved".
// We keep leave_balances.used in step with that fact:
//   • a request entering  "Approved"  → add its days to `used`
//   • a request leaving   "Approved"  → subtract its days back
// Every other status transition is a no-op. Closing balance is recomputed
// (clamped at 0, mirroring the convention in admin-leave-plans) so the figure
// shown to employees drops on approval and is restored on cancel/reject.
//
// This is the direct-adjust approach — it mutates the leave_balances row in
// place rather than writing an itemised debit to leave_credit_transactions
// (whose unique (employee,type,period,kind) index can't hold two usages in one
// period). An append-only usage ledger can be layered on later if needed.

import { sql } from "drizzle-orm";
import { type Db } from "@/db/runtime";
import { leaveBalances } from "@/db/schema/hrms";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type LeaveBalanceExec = Db | Tx;

const APPROVED = "Approved";

/** Adjust `used` for one (employee, leaveType) by a signed day delta and
 *  recompute the clamped closing balance. Upserts the row when missing. */
async function adjustUsed(
  exec: LeaveBalanceExec,
  employeeId: number,
  leaveTypeId: number,
  deltaDays: number,
): Promise<void> {
  if (deltaDays === 0) return;
  await exec
    .insert(leaveBalances)
    .values({
      employeeId,
      leaveTypeId,
      openingBalance: "0",
      accrued: "0",
      // A brand-new balance row can only be a deduction (delta > 0).
      used: String(Math.max(0, deltaDays)),
      carriedForward: "0",
      closingBalance: "0",
    })
    .onConflictDoUpdate({
      target: [leaveBalances.employeeId, leaveBalances.leaveTypeId],
      set: {
        used: sql`GREATEST(0, ${leaveBalances.used} + ${deltaDays})`,
        closingBalance: sql`GREATEST(0, ${leaveBalances.openingBalance} + ${leaveBalances.accrued} + ${leaveBalances.carriedForward} - GREATEST(0, ${leaveBalances.used} + ${deltaDays}))`,
      },
    });
}

/**
 * Reconcile leave_balances.used for a single request's status transition.
 * Pass the executor (use the same tx as the status update for atomicity),
 * the request's employee/type/days, and the previous + next status.
 */
export async function syncLeaveUsageOnTransition(
  exec: LeaveBalanceExec,
  req: { employeeId: number; leaveTypeId: number; days: string | number },
  prevStatus: string | null | undefined,
  nextStatus: string,
): Promise<void> {
  const days = Number(req.days);
  if (!Number.isFinite(days) || days <= 0) return;

  const wasApproved = prevStatus === APPROVED;
  const nowApproved = nextStatus === APPROVED;
  if (wasApproved === nowApproved) return; // not crossing the Approved boundary

  await adjustUsed(
    exec,
    req.employeeId,
    req.leaveTypeId,
    nowApproved ? days : -days,
  );
}
