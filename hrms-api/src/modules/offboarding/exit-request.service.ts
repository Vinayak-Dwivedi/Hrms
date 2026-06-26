// Manager-initiated exit requests + HR direct exit.
// Edge cases handled:
//  #1 Concurrent lock: one Pending request per employee at a time.
//  #2 Backdated LWD: flagged, attendance voiding hook called.
//  #3 Notice period days: read from active resignation flow scope.
//  #4 Active leave snapshot: captured at request time.
//  #6 Access revoke timing: per exit type.
//  #7 Settlement rule: defaulted by exit type.
//  #8 Rejection: employee status stays Active, no visible trace.
//  #9 Re-raise after rejection: allowed (Pending gate only).

import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  attendanceRecords,
  employeeExitRequests,
  employeeExits,
  employees,
  leaveRequests,
  resignationFlowScope,
  resignationFlows,
} from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";

export type ExitType =
  | "Absconding"
  | "ResignedWithoutNotice"
  | "ResignedWithPartialNotice"
  | "Resigned"
  | "Terminated";

export type SettlementRule =
  | "EncashLeave"
  | "ForfeitLeave"
  | "PartialEncash"
  | "Depends";

const DEFAULT_SETTLEMENT_RULE: Record<ExitType, SettlementRule> = {
  Resigned: "EncashLeave",
  ResignedWithoutNotice: "ForfeitLeave",
  ResignedWithPartialNotice: "PartialEncash",
  Absconding: "ForfeitLeave",
  Terminated: "Depends",
};

const DEFAULT_ACCESS_TIMING: Record<ExitType, "Immediate" | "OnLWD"> = {
  Absconding: "Immediate",
  ResignedWithoutNotice: "Immediate",
  ResignedWithPartialNotice: "OnLWD",
  Resigned: "OnLWD",
  Terminated: "Immediate",
};

// ── Helpers ──

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Verify no Pending exit request already exists for this employee. */
async function assertNoPendingRequest(employeeId: number): Promise<void> {
  const [existing] = await db
    .select({ id: employeeExitRequests.id, status: employeeExitRequests.status })
    .from(employeeExitRequests)
    .where(
      and(
        eq(employeeExitRequests.employeeId, employeeId),
        eq(employeeExitRequests.status, "Pending"),
      ),
    )
    .limit(1);
  if (existing) {
    throw new ApiError(
      409,
      "EXIT_REQUEST_EXISTS",
      "An exit request for this employee is already pending HR review. Withdraw or wait for it to be resolved before raising a new one.",
    );
  }
}

/** Verify employee is still Active (not already exited). */
async function assertEmployeeActive(employeeId: number): Promise<void> {
  const [emp] = await db
    .select({ employeeStatus: employees.employeeStatus, id: employees.id })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp) throw new ApiError(404, "EMP_NOT_FOUND", "Employee not found.");
  if (emp.employeeStatus !== "Active") {
    throw new ApiError(
      409,
      "EMP_NOT_ACTIVE",
      "Cannot raise an exit request for an employee who is not Active.",
    );
  }
}

/** Snapshot active / upcoming leave requests for the employee. */
async function captureActiveLeaves(
  employeeId: number,
  asOfDate: string,
): Promise<unknown[]> {
  const rows = await db
    .select({
      id: leaveRequests.id,
      fromDate: leaveRequests.fromDate,
      toDate: leaveRequests.toDate,
      status: leaveRequests.status,
      leaveTypeId: leaveRequests.leaveTypeId,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, employeeId),
        or(
          eq(leaveRequests.status, "Approved"),
          eq(leaveRequests.status, "Pending"),
        ),
        gte(leaveRequests.toDate, asOfDate),
      ),
    );
  return rows;
}

/** Look up notice period days from the active resignation flow for this employee.
 *  Falls back to null if no flow is found (manual HR input required). */
async function lookupNoticePeriodDays(
  employeeId: number,
): Promise<number | null> {
  // Try to find a Branch-scoped flow first, then Company/default.
  const [emp] = await db
    .select({ branchId: employees.branchId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!emp) return null;

  // Look for active default flow first.
  const [defaultFlow] = await db
    .select({ noticePeriodDays: resignationFlows.noticePeriodDays })
    .from(resignationFlows)
    .where(
      and(
        eq(resignationFlows.isActive, true),
        eq(resignationFlows.isDefault, true),
      ),
    )
    .limit(1);

  if (emp.branchId) {
    // Look for a branch-scoped flow.
    const [scopedFlow] = await db
      .select({ noticePeriodDays: resignationFlows.noticePeriodDays })
      .from(resignationFlowScope)
      .innerJoin(resignationFlows, eq(resignationFlowScope.flowId, resignationFlows.id))
      .where(
        and(
          eq(resignationFlowScope.scopeType, "Branch"),
          eq(resignationFlowScope.scopeId, emp.branchId),
          eq(resignationFlows.isActive, true),
        ),
      )
      .limit(1);
    if (scopedFlow) return scopedFlow.noticePeriodDays;
  }

  return defaultFlow?.noticePeriodDays ?? null;
}

// ── Manager: create exit request ──

export async function createExitRequest(
  managerId: number,
  input: {
    employeeId: number;
    exitType: "Absconding" | "ResignedWithoutNotice";
    requestedLwd?: string | null;
    evidenceNote?: string | null;
    noticeServedDays?: number;
  },
  auditCtx: { ipAddress: string | null; userAgent: string | null },
) {
  // Edge case #8/#9: ensure employee is Active and no pending request exists.
  await Promise.all([
    assertEmployeeActive(input.employeeId),
    assertNoPendingRequest(input.employeeId),
  ]);

  const today = todayStr();
  const isBackdated = !!input.requestedLwd && input.requestedLwd < today;

  // Edge case #4: snapshot active leaves.
  const activeLeavesSnapshot = await captureActiveLeaves(
    input.employeeId,
    input.requestedLwd ?? today,
  );

  // Edge case #3: pull notice period from flow config.
  const noticeRequiredDays = await lookupNoticePeriodDays(input.employeeId);

  const [req] = await db
    .insert(employeeExitRequests)
    .values({
      employeeId: input.employeeId,
      requestedBy: managerId,
      exitType: input.exitType,
      requestedLwd: input.requestedLwd ?? null,
      evidenceNote: input.evidenceNote ?? null,
      activeLeavesSnapshot,
      noticeRequiredDays,
      noticeServedDays: input.noticeServedDays ?? 0,
      settlementRule: DEFAULT_SETTLEMENT_RULE[input.exitType],
      accessRevokeTiming: DEFAULT_ACCESS_TIMING[input.exitType],
      status: "Pending",
    })
    .returning();

  writeAuditLogAsync({
    actorEmployeeId: managerId,
    action: "EXIT_REQUEST_RAISED",
    entityType: "employee",
    entityId: String(input.employeeId),
    metadata: { exitType: input.exitType, requestedLwd: input.requestedLwd },
    ipAddress: auditCtx.ipAddress,
    userAgent: auditCtx.userAgent,
  });

  return { request: req, isBackdated, activeLeavesCount: activeLeavesSnapshot.length };
}

export async function listManagerExitRequests(managerId: number) {
  return db
    .select()
    .from(employeeExitRequests)
    .where(eq(employeeExitRequests.requestedBy, managerId))
    .orderBy(desc(employeeExitRequests.createdAt));
}

// ── HR: list + approve + reject ──

export async function listHrExitRequests() {
  return db
    .select()
    .from(employeeExitRequests)
    .orderBy(desc(employeeExitRequests.createdAt));
}

export async function getExitRequestById(id: number) {
  const [req] = await db
    .select()
    .from(employeeExitRequests)
    .where(eq(employeeExitRequests.id, id))
    .limit(1);
  if (!req) throw new ApiError(404, "NOT_FOUND", "Exit request not found.");
  return req;
}

export async function hrApproveExitRequest(
  hrId: number,
  requestId: number,
  input: {
    lastWorkingDate: string;
    settlementRule?: string | null;
    accessRevokeTiming?: "Immediate" | "OnLWD";
    hrRemarks?: string | null;
  },
  auditCtx: { ipAddress: string | null; userAgent: string | null },
) {
  const req = await getExitRequestById(requestId);
  if (req.status !== "Pending") {
    throw new ApiError(409, "NOT_PENDING", "Request is not in Pending state.");
  }

  const today = todayStr();
  const isBackdated = input.lastWorkingDate < today;

  return db.transaction(async (tx) => {
    // 1. Update request status.
    await tx
      .update(employeeExitRequests)
      .set({
        status: "Approved",
        hrActionBy: hrId,
        hrRemarks: input.hrRemarks ?? null,
        settlementRule: input.settlementRule ?? req.settlementRule,
        accessRevokeTiming: input.accessRevokeTiming ?? (req.accessRevokeTiming as "Immediate" | "OnLWD"),
      })
      .where(eq(employeeExitRequests.id, requestId));

    // 2. Create official exit record.
    const [exit] = await tx
      .insert(employeeExits)
      .values({
        employeeId: req.employeeId,
        exitType: req.exitType as ExitType,
        initiatedBy: "Manager",
        exitRequestId: requestId,
        lastWorkingDate: input.lastWorkingDate,
        effectiveDate: input.lastWorkingDate,
        noticeRequiredDays: req.noticeRequiredDays,
        noticeServedDays: req.noticeServedDays,
        settlementRule: input.settlementRule ?? req.settlementRule,
        isBackdated,
        createdBy: hrId,
      })
      .returning();

    // 3. Mark employee Inactive + set exit date.
    await tx
      .update(employees)
      .set({ employeeStatus: "Inactive", dateOfExit: input.lastWorkingDate })
      .where(eq(employees.id, req.employeeId));

    // 4. Edge case #2: void future attendance records if backdated.
    if (isBackdated) {
      await tx
        .delete(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, req.employeeId),
            gte(attendanceRecords.date, input.lastWorkingDate),
          ),
        );
    }

    // 5. Edge case #6: immediate access revocation for Absconding.
    const shouldRevokeNow =
      (input.accessRevokeTiming ?? req.accessRevokeTiming) === "Immediate";
    if (shouldRevokeNow && exit) {
      await tx
        .update(employeeExits)
        .set({ accessRevokedAt: new Date() })
        .where(eq(employeeExits.id, exit.id));
    }

    writeAuditLogAsync({
      actorEmployeeId: hrId,
      action: "EXIT_REQUEST_APPROVED",
      entityType: "employee",
      entityId: String(req.employeeId),
      metadata: { exitType: req.exitType, lastWorkingDate: input.lastWorkingDate, isBackdated },
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return { exit, isBackdated };
  });
}

export async function hrRejectExitRequest(
  hrId: number,
  requestId: number,
  hrRemarks: string | null,
  auditCtx: { ipAddress: string | null; userAgent: string | null },
) {
  const req = await getExitRequestById(requestId);
  if (req.status !== "Pending") {
    throw new ApiError(409, "NOT_PENDING", "Request is not in Pending state.");
  }

  // Edge case #8: rejection leaves employee Active — no employee status change needed.
  await db
    .update(employeeExitRequests)
    .set({ status: "Rejected", hrActionBy: hrId, hrRemarks })
    .where(eq(employeeExitRequests.id, requestId));

  writeAuditLogAsync({
    actorEmployeeId: hrId,
    action: "EXIT_REQUEST_REJECTED",
    entityType: "employee",
    entityId: String(req.employeeId),
    metadata: { hrRemarks },
    ipAddress: auditCtx.ipAddress,
    userAgent: auditCtx.userAgent,
  });

  return getExitRequestById(requestId);
}

// ── HR: direct exit (all 5 types, no prior request) ──

export async function hrDirectExit(
  hrId: number,
  input: {
    employeeId: number;
    exitType: ExitType;
    lastWorkingDate: string;
    noticeRequiredDays?: number | null;
    noticeServedDays?: number | null;
    settlementRule?: SettlementRule | null;
    terminationReasonCode?: string | null;
    remarks?: string | null;
    accessRevokeTiming?: "Immediate" | "OnLWD";
  },
  auditCtx: { ipAddress: string | null; userAgent: string | null },
) {
  await assertEmployeeActive(input.employeeId);

  const today = todayStr();
  const isBackdated = input.lastWorkingDate < today;
  const settlementRule = input.settlementRule ?? DEFAULT_SETTLEMENT_RULE[input.exitType];
  const accessTiming = input.accessRevokeTiming ?? DEFAULT_ACCESS_TIMING[input.exitType];

  // Edge case #4: capture active leaves for HR's awareness.
  const activeLeavesSnapshot = await captureActiveLeaves(
    input.employeeId,
    input.lastWorkingDate,
  );

  return db.transaction(async (tx) => {
    const [exit] = await tx
      .insert(employeeExits)
      .values({
        employeeId: input.employeeId,
        exitType: input.exitType,
        initiatedBy: "HR",
        lastWorkingDate: input.lastWorkingDate,
        effectiveDate: input.lastWorkingDate,
        noticeRequiredDays: input.noticeRequiredDays ?? null,
        noticeServedDays: input.noticeServedDays ?? null,
        settlementRule,
        terminationReasonCode: input.terminationReasonCode ?? null,
        remarks: input.remarks ?? null,
        isBackdated,
        createdBy: hrId,
      })
      .returning();

    // Mark employee Inactive.
    await tx
      .update(employees)
      .set({ employeeStatus: "Inactive", dateOfExit: input.lastWorkingDate })
      .where(eq(employees.id, input.employeeId));

    // Edge case #2: void future attendance records if backdated.
    if (isBackdated) {
      await tx
        .delete(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, input.employeeId),
            gte(attendanceRecords.date, input.lastWorkingDate),
          ),
        );
    }

    // Edge case #6: immediate access revocation.
    if (accessTiming === "Immediate" && exit) {
      await tx
        .update(employeeExits)
        .set({ accessRevokedAt: new Date() })
        .where(eq(employeeExits.id, exit.id));
    }

    writeAuditLogAsync({
      actorEmployeeId: hrId,
      action: "HR_DIRECT_EXIT",
      entityType: "employee",
      entityId: String(input.employeeId),
      metadata: { exitType: input.exitType, lastWorkingDate: input.lastWorkingDate, isBackdated, settlementRule },
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return {
      exit,
      isBackdated,
      activeLeavesCount: activeLeavesSnapshot.length,
      activeLeavesSnapshot,
    };
  });
}

// ── Read ──

export async function getEmployeeExit(employeeId: number) {
  const [exit] = await db
    .select()
    .from(employeeExits)
    .where(eq(employeeExits.employeeId, employeeId))
    .limit(1);
  return exit ?? null;
}

export async function listEmployeeExits() {
  return db.select().from(employeeExits).orderBy(desc(employeeExits.createdAt));
}
