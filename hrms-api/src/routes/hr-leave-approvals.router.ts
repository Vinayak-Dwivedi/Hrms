// HR final-approval endpoints for leave requests that managers have
// forwarded. Mounted at /api/hr/leave-approvals.
//
// Authorisation: relies on the global requireAuth middleware. Permission
// gating ("only HR can hit these") is enforced via the requirePermission
// middleware where the router is mounted.

import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import { employees, leaveRequests, leaveTypes } from "@/db/schema/hrms";
import { loadCurrentEmployee } from "@/lib/employee";
import { ApiError } from "@/middleware/error";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { loadLeaveRequestParticipants } from "@/services/leave-routing";
import {
  notifyEmployeeOnApproval,
  notifyEmployeeOnRejection,
} from "@/services/leave-notifications";
import { syncLeaveUsageOnTransition } from "@/services/leave-balance";

export const hrLeaveApprovalsRouter: Router = Router();

function parseLeaveId(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ApiError(400, "BAD_ID", "Numeric id required.");
  }
  return n;
}

const remarksBody = z
  .object({ remarks: z.string().max(2000).optional() })
  .strict();

// GET /api/hr/leave-approvals?status=Forwarded
//   Defaults to Forwarded (the HR queue). Pass status=all for everything.
hrLeaveApprovalsRouter.get("/", async (req, res, next) => {
  try {
    const statusQ =
      typeof req.query.status === "string" ? req.query.status : "Forwarded";
    const rows = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        empId: employees.empId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        workEmail: employees.workEmail,
        leaveTypeCode: leaveTypes.code,
        leaveTypeName: leaveTypes.name,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        days: leaveRequests.days,
        durationType: leaveRequests.durationType,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        managerId: leaveRequests.managerId,
        managerDecision: leaveRequests.managerDecision,
        managerDecidedAt: leaveRequests.managerDecidedAt,
        managerRemarks: leaveRequests.managerRemarks,
        appliedOn: leaveRequests.appliedOn,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        statusQ === "all"
          ? undefined
          : eq(
              leaveRequests.status,
              statusQ as "Pending" | "Approved" | "Rejected" | "Cancelled" | "Forwarded",
            ),
      )
      .orderBy(desc(leaveRequests.createdAt));
    res.json({ requests: rows });
  } catch (e) {
    next(e);
  }
});

hrLeaveApprovalsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const hrUser = await loadCurrentEmployee(req.user!.id);
    const idNum = parseLeaveId(req.params.id);
    const body = remarksBody.parse(req.body ?? {});
    const ctx = await loadLeaveRequestParticipants(idNum);
    if (!ctx) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }
    const row = await db.transaction(async (tx) => {
      const [prev] = await tx
        .select({ status: leaveRequests.status })
        .from(leaveRequests)
        .where(eq(leaveRequests.id, idNum))
        .limit(1);
      const [updated] = await tx
        .update(leaveRequests)
        .set({
          hrId: hrUser.id,
          hrDecision: "Approved",
          hrDecidedAt: new Date(),
          hrRemarks: body.remarks ?? null,
          status: "Approved",
        })
        .where(eq(leaveRequests.id, idNum))
        .returning();
      if (updated) {
        // HR is the final approver — deduct from the employee's balance.
        await syncLeaveUsageOnTransition(
          tx,
          updated,
          prev?.status,
          updated.status,
        );
      }
      return updated;
    });
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }

    writeAuditLogAsync({
      actorUserId: req.user!.id,
      actorEmployeeId: hrUser.id,
      action: "LEAVE_APPROVED_BY_HR",
      entityType: "leave_request",
      entityId: String(idNum),
      metadata: { remarks: body.remarks ?? null },
    });

    notifyEmployeeOnApproval(ctx.participants, ctx.request, "HR").catch(
      () => {},
    );

    res.json({ request: row });
  } catch (e) {
    next(e);
  }
});

hrLeaveApprovalsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    const hrUser = await loadCurrentEmployee(req.user!.id);
    const idNum = parseLeaveId(req.params.id);
    const body = remarksBody.parse(req.body ?? {});
    const ctx = await loadLeaveRequestParticipants(idNum);
    if (!ctx) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }
    const row = await db.transaction(async (tx) => {
      const [prev] = await tx
        .select({ status: leaveRequests.status })
        .from(leaveRequests)
        .where(eq(leaveRequests.id, idNum))
        .limit(1);
      const [updated] = await tx
        .update(leaveRequests)
        .set({
          hrId: hrUser.id,
          hrDecision: "Rejected",
          hrDecidedAt: new Date(),
          hrRemarks: body.remarks ?? null,
          status: "Rejected",
        })
        .where(eq(leaveRequests.id, idNum))
        .returning();
      if (updated) {
        // Restore balance if this leave had already been deducted (Approved).
        await syncLeaveUsageOnTransition(
          tx,
          updated,
          prev?.status,
          updated.status,
        );
      }
      return updated;
    });
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
    }

    writeAuditLogAsync({
      actorUserId: req.user!.id,
      actorEmployeeId: hrUser.id,
      action: "LEAVE_REJECTED_BY_HR",
      entityType: "leave_request",
      entityId: String(idNum),
      metadata: { remarks: body.remarks ?? null },
    });

    notifyEmployeeOnRejection(
      ctx.participants,
      ctx.request,
      "HR",
      body.remarks ?? null,
    ).catch(() => {});

    res.json({ request: row });
  } catch (e) {
    next(e);
  }
});
