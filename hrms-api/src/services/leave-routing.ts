// Leave approval routing — decides what happens after each decision.
//
// Decision tree, keyed off the matching policy's `settings.requiresHRApproval`:
//
//   manager APPROVE
//     ├─ requiresHRApproval=true  → status becomes "Forwarded"; HR notified
//     └─ otherwise                → status becomes "Approved";  employee notified
//
//   manager REJECT                → status "Rejected"; employee notified
//   manager FORWARD (explicit)    → status "Forwarded"; HR notified
//   HR APPROVE                    → status "Approved";  employee notified
//   HR REJECT                     → status "Rejected"; employee notified
//
// Also exposes a `loadLeaveRequestParticipants` helper that gathers the
// employee, manager and HR contact details in one query for the notification
// service.

import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  employees,
  leavePolicies,
  leaveRequests,
  leaveTypes,
} from "@/db/schema/hrms";
import { resolvePolicyForEmployee } from "@/services/leave-policy-resolver";
import { env } from "@/env";

export interface LeaveParticipants {
  employeeId: number;
  employeeName: string;
  employeeWorkEmail: string | null;
  managerEmployeeId: number | null;
  managerName: string | null;
  managerWorkEmail: string | null;
  hrEmail: string | null;
}

export interface LeaveRequestRow {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  days: number;
  durationType: string;
  reason: string;
  leaveTypeName: string;
}

function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first ?? "", last ?? ""].join(" ").trim() || "Employee";
}

export async function loadLeaveRequestParticipants(
  requestId: number,
): Promise<{
  participants: LeaveParticipants;
  request: LeaveRequestRow;
} | null> {
  const [row] = await db
    .select({
      id: leaveRequests.id,
      employeeId: leaveRequests.employeeId,
      leaveTypeId: leaveRequests.leaveTypeId,
      fromDate: leaveRequests.fromDate,
      toDate: leaveRequests.toDate,
      days: leaveRequests.days,
      durationType: leaveRequests.durationType,
      reason: leaveRequests.reason,
      leaveTypeName: leaveTypes.name,
      employeeFirst: employees.firstName,
      employeeLast: employees.lastName,
      employeeWorkEmail: employees.workEmail,
      managerId: employees.reportingManagerId,
    })
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(eq(leaveRequests.id, requestId))
    .limit(1);
  if (!row) return null;

  let managerName: string | null = null;
  let managerWorkEmail: string | null = null;
  if (row.managerId != null) {
    const [mgr] = await db
      .select({
        firstName: employees.firstName,
        lastName: employees.lastName,
        workEmail: employees.workEmail,
      })
      .from(employees)
      .where(eq(employees.id, row.managerId))
      .limit(1);
    if (mgr) {
      managerName = fullName(mgr.firstName, mgr.lastName);
      managerWorkEmail = mgr.workEmail;
    }
  }

  return {
    participants: {
      employeeId: row.employeeId,
      employeeName: fullName(row.employeeFirst, row.employeeLast),
      employeeWorkEmail: row.employeeWorkEmail,
      managerEmployeeId: row.managerId,
      managerName,
      managerWorkEmail,
      hrEmail: env.COMPANY_SUPPORT_EMAIL ?? null,
    },
    request: {
      id: row.id,
      employeeId: row.employeeId,
      leaveTypeId: row.leaveTypeId,
      fromDate:
        typeof row.fromDate === "string"
          ? row.fromDate
          : new Date(row.fromDate as unknown as string).toISOString().slice(0, 10),
      toDate:
        typeof row.toDate === "string"
          ? row.toDate
          : new Date(row.toDate as unknown as string).toISOString().slice(0, 10),
      days: Number(row.days),
      durationType: row.durationType,
      reason: row.reason,
      leaveTypeName: row.leaveTypeName,
    },
  };
}

// Read `requiresHRApproval` off the resolved policy's JSONB settings. Default
// is false so existing policies without the field continue to behave like a
// single-stage manager-only flow.
export async function requiresHRApprovalForEmployee(
  employeeId: number,
  leaveTypeId: number,
): Promise<boolean> {
  const resolved = await resolvePolicyForEmployee(employeeId, {
    id: leaveTypeId,
  });
  if (!resolved?.policy) return false;
  const settings = (resolved.policy.settings ?? {}) as Record<string, unknown>;
  return settings.requiresHRApproval === true;
}
