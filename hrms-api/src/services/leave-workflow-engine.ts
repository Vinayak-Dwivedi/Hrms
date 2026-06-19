// Runs the approval workflow attached to an employee's resolved policy after
// a leave request is inserted.
//
// Flow:
//   1. Resolve the employee's policy for this leave_type.
//   2. Load all active approval workflows on that policy.
//   3. For each workflow, evaluate its criteria against the leave request.
//   4. The first matching workflow wins. Apply its outcome:
//        - AutoApprove → flip status to Approved, set manager_decided_at,
//                        log the approval to audit_logs, and (TODO) send the
//                        configured email when SMTP is wired.
//        - AutoReject  → flip status to Rejected, set manager_decided_at,
//                        with the workflow's body as manager_remarks.
//        - Route       → no-op (leaves it Pending for the manager to act).
//
// If nothing matches, status stays Pending → manager handles it as before.

import { and, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  leaveApprovalWorkflows,
  leaveRequests,
  leaveTypes,
} from "@/db/schema/hrms";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { resolvePolicyForEmployee } from "@/services/leave-policy-resolver";
import { loadLeaveRequestParticipants } from "@/services/leave-routing";
import {
  notifyEmployeeOnApproval,
  notifyEmployeeOnRejection,
} from "@/services/leave-notifications";
import { syncLeaveUsageOnTransition } from "@/services/leave-balance";

interface Criterion {
  field: string;
  operator: string;
  value: string;
}

interface LeaveRequestContext {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  leaveTypeCode?: string;
  leaveTypeName?: string;
  days: number;
  durationType: string;
  reason: string;
}

function evaluateCriterion(c: Criterion, ctx: LeaveRequestContext): boolean {
  // Pick the field value off the context. Strings are compared lowercased
  // so "Casual Leave" matches "casual leave".
  let lhs: string | number | null = null;
  switch (c.field) {
    case "Leave Type":
      lhs = ctx.leaveTypeName ?? ctx.leaveTypeCode ?? "";
      break;
    case "Number of Days":
      lhs = ctx.days;
      break;
    case "Duration":
      lhs = ctx.durationType;
      break;
    case "Reason":
      lhs = ctx.reason;
      break;
    default:
      return false;
  }
  const rhs = c.value;

  const numericLhs = typeof lhs === "number" ? lhs : Number(lhs);
  const numericRhs = Number(rhs);

  switch (c.operator) {
    case "is":
      return String(lhs).trim().toLowerCase() === rhs.trim().toLowerCase();
    case "is not":
      return String(lhs).trim().toLowerCase() !== rhs.trim().toLowerCase();
    case "contains":
      return String(lhs).toLowerCase().includes(rhs.toLowerCase());
    case "greater than":
      return Number.isFinite(numericLhs) && Number.isFinite(numericRhs) && numericLhs > numericRhs;
    case "less than":
      return Number.isFinite(numericLhs) && Number.isFinite(numericRhs) && numericLhs < numericRhs;
    default:
      return false;
  }
}

function workflowMatches(criteria: Criterion[], ctx: LeaveRequestContext): boolean {
  if (criteria.length === 0) return true;
  // AND across criteria.
  return criteria.every((c) => evaluateCriterion(c, ctx));
}

export async function runWorkflowOnNewRequest(args: {
  requestId: number;
  employeeId: number;
  leaveTypeId: number;
  days: number;
  durationType: string;
  reason: string;
  actorUserId: string;
}): Promise<{ status: "Pending" | "Approved" | "Rejected"; workflowName: string | null }> {
  const [type] = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.id, args.leaveTypeId))
    .limit(1);

  const resolved = await resolvePolicyForEmployee(args.employeeId, {
    id: args.leaveTypeId,
  });

  if (!resolved?.policy) {
    return { status: "Pending", workflowName: null };
  }

  const workflows = await db
    .select()
    .from(leaveApprovalWorkflows)
    .where(
      and(
        eq(leaveApprovalWorkflows.policyId, resolved.policy.id),
        eq(leaveApprovalWorkflows.isActive, true),
      ),
    );

  if (workflows.length === 0) {
    return { status: "Pending", workflowName: null };
  }

  const ctx: LeaveRequestContext = {
    id: args.requestId,
    employeeId: args.employeeId,
    leaveTypeId: args.leaveTypeId,
    leaveTypeCode: type?.code,
    leaveTypeName: type?.name,
    days: args.days,
    durationType: args.durationType,
    reason: args.reason,
  };

  const winner = workflows.find((w) =>
    workflowMatches(w.criteria as Criterion[], ctx),
  );

  if (!winner) {
    return { status: "Pending", workflowName: null };
  }

  if (winner.outcome === "AutoApprove") {
    await db.transaction(async (tx) => {
      await tx
        .update(leaveRequests)
        .set({
          status: "Approved",
          managerDecision: "Approved",
          managerDecidedAt: new Date(),
          managerRemarks: `Auto-approved by workflow "${winner.name}".`,
        })
        .where(eq(leaveRequests.id, args.requestId));
      // Auto-approved on submission — deduct from the employee's balance.
      await syncLeaveUsageOnTransition(
        tx,
        {
          employeeId: args.employeeId,
          leaveTypeId: args.leaveTypeId,
          days: args.days,
        },
        "Pending",
        "Approved",
      );
    });
    writeAuditLogAsync({
      actorUserId: args.actorUserId,
      actorEmployeeId: args.employeeId,
      action: "LEAVE_AUTO_APPROVED",
      entityType: "leave_request",
      entityId: String(args.requestId),
      metadata: {
        workflowId: winner.id,
        workflowName: winner.name,
      },
    });
    // Notify employee using the workflow's own subject/body template if set.
    const ctx = await loadLeaveRequestParticipants(args.requestId);
    if (ctx) {
      notifyEmployeeOnApproval(
        ctx.participants,
        ctx.request,
        `policy workflow "${winner.name}"`,
        { subject: winner.subject, body: winner.body },
      ).catch(() => {});
    }
    return { status: "Approved", workflowName: winner.name };
  }

  if (winner.outcome === "AutoReject") {
    await db
      .update(leaveRequests)
      .set({
        status: "Rejected",
        managerDecision: "Rejected",
        managerDecidedAt: new Date(),
        managerRemarks: `Auto-rejected by workflow "${winner.name}".`,
      })
      .where(eq(leaveRequests.id, args.requestId));
    writeAuditLogAsync({
      actorUserId: args.actorUserId,
      actorEmployeeId: args.employeeId,
      action: "LEAVE_AUTO_REJECTED",
      entityType: "leave_request",
      entityId: String(args.requestId),
      metadata: {
        workflowId: winner.id,
        workflowName: winner.name,
      },
    });
    const ctx = await loadLeaveRequestParticipants(args.requestId);
    if (ctx) {
      notifyEmployeeOnRejection(
        ctx.participants,
        ctx.request,
        `policy workflow "${winner.name}"`,
        `Auto-rejected by workflow "${winner.name}".`,
        { subject: winner.subject, body: winner.body },
      ).catch(() => {});
    }
    return { status: "Rejected", workflowName: winner.name };
  }

  // Route — caller already set Pending + assigned manager.
  return { status: "Pending", workflowName: winner.name };
}
