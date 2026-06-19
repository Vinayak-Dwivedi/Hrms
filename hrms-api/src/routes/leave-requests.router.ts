import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Router } from "express";
import { db } from "@/db/runtime";
import {
  orgHierarchyDesignations as designations,
  employees,
  leaveRequests,
  leaveTypes,
} from "@/db/schema/hrms";
import { requirePermission } from "@/middleware/require-permission";

export const leaveRequestsRouter: Router = Router();

// Self-join alias to surface each employee's reporting manager (Manager column).
const reportingMgr = alias(employees, "reporting_mgr");

const leaveView = requirePermission("leave.view");

function capStatus(s: string): string {
  return (s[0]?.toUpperCase() ?? "") + s.slice(1);
}

// GET /api/hrms/leave-requests/recent?status=pending|all&limit=10
// Org-wide recent leave requests for admin dashboard (not team-scoped).
leaveRequestsRouter.get("/recent", leaveView, async (req, res, next) => {
  try {
    const statusQ =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const conds = [];
    if (statusQ && statusQ !== "all") {
      conds.push(eq(leaveRequests.status, capStatus(statusQ) as never));
    }

    const rows = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        empId: employees.empId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: designations.name,
        leaveTypeName: leaveTypes.name,
        leaveTypeCode: leaveTypes.code,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        days: leaveRequests.days,
        durationType: leaveRequests.durationType,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        appliedOn: leaveRequests.appliedOn,
        managerDecision: leaveRequests.managerDecision,
        managerDecidedAt: leaveRequests.managerDecidedAt,
        managerRemarks: leaveRequests.managerRemarks,
        reportingManager: sql<
          string | null
        >`${reportingMgr.firstName} || ' ' || ${reportingMgr.lastName}`,
        reportingManagerEmpId: reportingMgr.empId,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(reportingMgr, eq(reportingMgr.id, employees.reportingManagerId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(leaveRequests.appliedOn))
      .limit(limit);

    const [pendingRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "Pending"));

    res.json({
      requests: rows,
      pendingCount: pendingRow?.count ?? 0,
    });
  } catch (e) {
    next(e);
  }
});
