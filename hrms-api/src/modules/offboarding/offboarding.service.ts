import { and, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import {
  accessRevocations,
  clearanceTasks,
  clearanceTemplates,
  clearanceTemplateScope,
  orgHierarchyDepartments as departments,
  designations,
  employees,
  exitDocuments,
  exitDocumentTemplates,
  exitInterviewResponses,
  exitInterviewTemplates,
  exitInterviewTemplateScope,
  exitReasons,
  fnfLineItems,
  fnfSettlements,
  leaveBalances,
  offboardingCases,
  resignationFlowScope,
  resignationFlows,
  resignations,
  subDepartments,
} from "@/db/schema/hrms";
import { alias } from "drizzle-orm/pg-core";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { extractPostgresError, mapDbErrorToApiError } from "@/lib/db-error";
import { ApiError } from "@/middleware/error";
import { CLEARANCE_TEAM_PERMISSION } from "@/modules/offboarding/offboarding.permissions";
import { resolveResignationFlowForEmployee } from "@/modules/offboarding/resignation-flow-resolver";
import { notify } from "@/services/notifications";
import type {
  ExitReasonUpsertInput,
  FlowUpsertInput,
  HrApproveInput,
  ManagerApproveInput,
  SubmitResignationInput,
} from "@/modules/offboarding/offboarding.schema";

type AuditCtx = { ipAddress?: string | null; userAgent?: string | null };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function wrapDbError(e: unknown): never {
  const pg = extractPostgresError(e);
  if (pg?.code === "23505") {
    const ctx = `${pg.constraint_name ?? ""} ${pg.detail ?? ""}`;
    if (/exit_reasons_label/i.test(ctx)) {
      throw new ApiError(409, "DUPLICATE_EXIT_REASON", "That exit reason already exists.");
    }
    if (/offboarding_cases_case_number/i.test(ctx)) {
      throw new ApiError(409, "DUPLICATE_CASE_NUMBER", "Case number collision, please retry.");
    }
    throw new ApiError(409, "DUPLICATE", "A record with this value already exists.");
  }
  if (pg?.code === "23503") {
    throw new ApiError(409, "REFERENCE_IN_USE", "Cannot delete: record is referenced by other data.");
  }
  throw mapDbErrorToApiError(e);
}

// ── System validation (non-blocking warnings) ──

export type ValidationItem = {
  code: string;
  level: "warning" | "info" | "ok";
  message: string;
};

async function openLeaveDays(employeeId: number): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${leaveBalances.closingBalance}), 0)`,
    })
    .from(leaveBalances)
    .where(eq(leaveBalances.employeeId, employeeId));
  return Number(row?.total ?? 0);
}

function buildValidation(
  noticePeriodDays: number | null,
  lastWorkingDate: string,
  openDays: number,
): ValidationItem[] {
  const items: ValidationItem[] = [];

  // Notice period.
  if (noticePeriodDays != null) {
    const served = daysBetween(todayIso(), lastWorkingDate);
    if (served < noticePeriodDays) {
      items.push({
        code: "notice_period",
        level: "warning",
        message: `Notice period short by ${noticePeriodDays - served} day(s) (policy ${noticePeriodDays}, serving ${Math.max(served, 0)}).`,
      });
    } else {
      items.push({
        code: "notice_period",
        level: "ok",
        message: `Notice period satisfied (${served} of ${noticePeriodDays} days).`,
      });
    }
  }

  // Open leave balance.
  items.push(
    openDays > 0
      ? {
          code: "open_leave_balance",
          level: "info",
          message: `Open leave balance: ${openDays} day(s) — review for encashment.`,
        }
      : { code: "open_leave_balance", level: "ok", message: "No open leave balance." },
  );

  // Manual checks (no data source yet).
  items.push({
    code: "attendance_issue",
    level: "info",
    message: "Review pending attendance regularisations before relieving.",
  });
  items.push({
    code: "active_assets",
    level: "info",
    message: "Confirm assigned company assets are returned during clearance.",
  });

  return items;
}

// ── Exit reasons ──

export async function listActiveExitReasons() {
  return db
    .select({ id: exitReasons.id, label: exitReasons.label })
    .from(exitReasons)
    .where(eq(exitReasons.isActive, true))
    .orderBy(exitReasons.sortOrder, exitReasons.label);
}

export async function listExitReasons() {
  return db.select().from(exitReasons).orderBy(exitReasons.sortOrder, exitReasons.label);
}

export async function createExitReason(input: ExitReasonUpsertInput) {
  try {
    const [row] = await db.insert(exitReasons).values(input).returning();
    return row;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateExitReason(id: number, input: Partial<ExitReasonUpsertInput>) {
  try {
    const [row] = await db
      .update(exitReasons)
      .set(input)
      .where(eq(exitReasons.id, id))
      .returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Exit reason not found.");
    return row;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    wrapDbError(e);
  }
}

export async function deleteExitReason(id: number) {
  const [row] = await db.delete(exitReasons).where(eq(exitReasons.id, id)).returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Exit reason not found.");
  return row;
}

// ── Resignation flows (admin config) ──

export async function listFlows() {
  return db.select().from(resignationFlows).orderBy(desc(resignationFlows.updatedAt));
}

export async function getFlow(id: number) {
  const [flow] = await db.select().from(resignationFlows).where(eq(resignationFlows.id, id)).limit(1);
  if (!flow) throw new ApiError(404, "NOT_FOUND", "Resignation flow not found.");
  const scope = await db
    .select()
    .from(resignationFlowScope)
    .where(eq(resignationFlowScope.flowId, id));
  return { ...flow, scope };
}

export async function createFlow(input: FlowUpsertInput, createdBy: number | null) {
  try {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(resignationFlows)
          .set({ isDefault: false })
          .where(eq(resignationFlows.isDefault, true));
      }
      const [flow] = await tx
        .insert(resignationFlows)
        .values({
          name: input.name,
          description: input.description ?? null,
          noticePeriodDays: input.noticePeriodDays,
          buyoutAllowed: input.buyoutAllowed,
          isActive: input.isActive,
          isDefault: input.isDefault,
          createdBy,
        })
        .returning();
      if (input.scope.length > 0) {
        await tx.insert(resignationFlowScope).values(
          input.scope.map((s) => ({
            flowId: flow!.id,
            scopeType: s.scopeType,
            scopeId: s.scopeId ?? null,
            priority: s.priority ?? 100,
          })),
        );
      }
      return flow!;
    });
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateFlow(id: number, input: Partial<FlowUpsertInput>) {
  await getFlow(id);
  try {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(resignationFlows)
          .set({ isDefault: false })
          .where(and(eq(resignationFlows.isDefault, true), sql`${resignationFlows.id} <> ${id}`));
      }
      const patch: Record<string, unknown> = {};
      for (const k of [
        "name",
        "description",
        "noticePeriodDays",
        "buyoutAllowed",
        "isActive",
        "isDefault",
      ] as const) {
        if (input[k] !== undefined) patch[k] = input[k];
      }
      const [flow] = await tx
        .update(resignationFlows)
        .set(patch)
        .where(eq(resignationFlows.id, id))
        .returning();
      if (input.scope) {
        await tx.delete(resignationFlowScope).where(eq(resignationFlowScope.flowId, id));
        if (input.scope.length > 0) {
          await tx.insert(resignationFlowScope).values(
            input.scope.map((s) => ({
              flowId: id,
              scopeType: s.scopeType,
              scopeId: s.scopeId ?? null,
              priority: s.priority ?? 100,
            })),
          );
        }
      }
      return flow!;
    });
  } catch (e) {
    wrapDbError(e);
  }
}

export async function deleteFlow(id: number) {
  const [row] = await db.delete(resignationFlows).where(eq(resignationFlows.id, id)).returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation flow not found.");
  return row;
}

// ── Employee: submit / mine / withdraw ──

const EMP_FIELDS = {
  empId: employees.empId,
  firstName: employees.firstName,
  lastName: employees.lastName,
  departmentId: employees.departmentId,
  reportingManagerId: employees.reportingManagerId,
  joiningDate: employees.joiningDate,
};

export async function submitResignation(
  emp: { id: number; reportingManagerId: number | null },
  input: SubmitResignationInput,
  attachmentPath: string | null,
  auditCtx: AuditCtx,
) {
  if (daysBetween(todayIso(), input.lastWorkingDate) < 0) {
    throw new ApiError(400, "LWD_IN_PAST", "Last working date cannot be in the past.");
  }
  // One active resignation at a time.
  const [existing] = await db
    .select({ id: resignations.id })
    .from(resignations)
    .where(
      and(
        eq(resignations.employeeId, emp.id),
        inArray(resignations.status, [
          "Submitted",
          "ManagerDiscussion",
          "ManagerApproved",
          "HRApproved",
          "OnHold",
        ]),
      ),
    )
    .limit(1);
  if (existing) {
    throw new ApiError(409, "RESIGNATION_IN_PROGRESS", "You already have a resignation in progress.");
  }

  const flow = await resolveResignationFlowForEmployee(emp.id);
  const noticePeriodDays = flow?.noticePeriodDays ?? null;
  const validation = buildValidation(
    noticePeriodDays,
    input.lastWorkingDate,
    await openLeaveDays(emp.id),
  );

  try {
    const [row] = await db
      .insert(resignations)
      .values({
        employeeId: emp.id,
        lastWorkingDate: input.lastWorkingDate,
        reason: input.reason,
        detailedRemark: input.detailedRemark,
        attachmentPath,
        buyoutRequested: input.buyoutRequested,
        buyoutStatus: input.buyoutRequested ? "Requested" : "None",
        status: "Submitted",
        submittedOn: todayIso(),
        flowId: flow?.id ?? null,
        noticePeriodDays,
        managerId: emp.reportingManagerId,
        validation,
        workflowStages: ["Manager", "HR"],
        currentStage: 0,
      })
      .returning();

    writeAuditLogAsync(
      {
        actorEmployeeId: emp.id,
        action: "RESIGNATION_SUBMITTED",
        entityType: "resignation",
        entityId: String(row!.id),
        metadata: { lastWorkingDate: input.lastWorkingDate, reason: input.reason },
      },
      auditCtx,
    );
    return { resignation: row!, validation };
  } catch (e) {
    wrapDbError(e);
  }
}

export async function getMyResignations(employeeId: number) {
  const rows = await db
    .select({
      r: resignations,
      caseNumber: offboardingCases.caseNumber,
      caseStatus: offboardingCases.status,
    })
    .from(resignations)
    .leftJoin(offboardingCases, eq(offboardingCases.resignationId, resignations.id))
    .where(eq(resignations.employeeId, employeeId))
    .orderBy(desc(resignations.createdAt));
  return rows.map(({ r, caseNumber, caseStatus }) => ({ ...r, caseNumber, caseStatus }));
}

export async function withdrawResignation(employeeId: number, id: number, auditCtx: AuditCtx) {
  const [row] = await db
    .select()
    .from(resignations)
    .where(and(eq(resignations.id, id), eq(resignations.employeeId, employeeId)))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (!["Submitted", "ManagerApproved"].includes(row.status)) {
    throw new ApiError(409, "CANNOT_WITHDRAW", "This resignation can no longer be withdrawn.");
  }
  const [updated] = await db
    .update(resignations)
    .set({ status: "Withdrawn" })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: employeeId,
      action: "RESIGNATION_WITHDRAWN",
      entityType: "resignation",
      entityId: String(id),
    },
    auditCtx,
  );
  return updated!;
}

// ── Manager queue ──

function joinEmployee() {
  return db
    .select({ r: resignations, e: EMP_FIELDS })
    .from(resignations)
    .innerJoin(employees, eq(employees.id, resignations.employeeId));
}

export async function listManagerResignations(managerId: number) {
  const rows = await joinEmployee()
    .where(eq(resignations.managerId, managerId))
    .orderBy(desc(resignations.createdAt));
  return rows.map(({ r, e }) => ({ ...r, employee: e }));
}

export async function managerApprove(
  managerId: number,
  id: number,
  input: ManagerApproveInput,
  auditCtx: AuditCtx,
) {
  const [row] = await db.select().from(resignations).where(eq(resignations.id, id)).limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (row.managerId !== managerId) {
    throw new ApiError(403, "NOT_YOUR_REPORT", "This resignation is not in your team.");
  }
  if (!["Submitted", "ManagerDiscussion"].includes(row.status)) {
    throw new ApiError(409, "NOT_PENDING_MANAGER", "This resignation is not pending manager review.");
  }
  const [updated] = await db
    .update(resignations)
    .set({
      managerDecision: "Approved",
      managerDecidedAt: new Date(),
      managerRemarks: input.remarks ?? null,
      recommendedLwd: input.recommendedLwd ?? null,
      knowledgeTransferRequired: input.knowledgeTransferRequired,
      replacementRequired: input.replacementRequired,
      criticalResource: input.criticalResource,
      status: "ManagerApproved",
      currentStage: 1,
    })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: managerId,
      action: "RESIGNATION_APPROVED_BY_MANAGER",
      entityType: "resignation",
      entityId: String(id),
      metadata: { recommendedLwd: input.recommendedLwd ?? null },
    },
    auditCtx,
  );
  notify(row.employeeId, "hr", "Resignation approved by your manager", "It has moved to HR for review.");
  return updated!;
}

export async function managerRequestDiscussion(
  managerId: number,
  id: number,
  note: string | null,
  auditCtx: AuditCtx,
) {
  const [row] = await db.select().from(resignations).where(eq(resignations.id, id)).limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (row.managerId !== managerId) {
    throw new ApiError(403, "NOT_YOUR_REPORT", "This resignation is not in your team.");
  }
  if (!["Submitted", "ManagerDiscussion"].includes(row.status)) {
    throw new ApiError(409, "NOT_PENDING_MANAGER", "This resignation is not pending manager review.");
  }
  const [updated] = await db
    .update(resignations)
    .set({ status: "ManagerDiscussion", discussionNote: note ?? null })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: managerId,
      action: "RESIGNATION_DISCUSSION_REQUESTED",
      entityType: "resignation",
      entityId: String(id),
    },
    auditCtx,
  );
  notify(
    row.employeeId,
    "hr",
    "Your manager has requested a discussion on your resignation",
    note ?? "Please connect with your reporting manager.",
  );
  return updated!;
}

export async function managerReject(
  managerId: number,
  id: number,
  remarks: string | null,
  auditCtx: AuditCtx,
) {
  const [row] = await db.select().from(resignations).where(eq(resignations.id, id)).limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (row.managerId !== managerId) {
    throw new ApiError(403, "NOT_YOUR_REPORT", "This resignation is not in your team.");
  }
  if (!["Submitted", "ManagerDiscussion"].includes(row.status)) {
    throw new ApiError(409, "NOT_PENDING_MANAGER", "This resignation is not pending manager review.");
  }
  const [updated] = await db
    .update(resignations)
    .set({
      managerDecision: "Rejected",
      managerDecidedAt: new Date(),
      managerRemarks: remarks ?? null,
      status: "ManagerRejected",
    })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: managerId,
      action: "RESIGNATION_REJECTED_BY_MANAGER",
      entityType: "resignation",
      entityId: String(id),
    },
    auditCtx,
  );
  notify(row.employeeId, "hr", "Your resignation was rejected by your manager", remarks ?? undefined);
  return updated!;
}

// ── HR review + case creation ──

export async function listHrResignations() {
  const rows = await joinEmployee()
    .where(
      inArray(resignations.status, ["ManagerApproved", "HRApproved", "OnHold", "Rejected"]),
    )
    .orderBy(desc(resignations.createdAt));
  return rows.map(({ r, e }) => ({ ...r, employee: e }));
}

async function nextCaseNumber(tx: Tx, year: number): Promise<string> {
  const prefix = `OFF-${year}-`;
  const rows = await tx
    .select({ caseNumber: offboardingCases.caseNumber })
    .from(offboardingCases)
    .where(like(offboardingCases.caseNumber, `${prefix}%`));
  let max = 0;
  for (const r of rows) {
    const n = Number(r.caseNumber.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function hrApprove(
  hrId: number,
  id: number,
  input: HrApproveInput,
  auditCtx: AuditCtx,
) {
  return await db.transaction(async (tx) => {
    const [row] = await tx.select().from(resignations).where(eq(resignations.id, id)).limit(1);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
    if (row.status !== "ManagerApproved") {
      throw new ApiError(409, "NOT_PENDING_HR", "This resignation is not pending HR review.");
    }
    const now = new Date();
    const [updated] = await tx
      .update(resignations)
      .set({
        hrId,
        hrDecision: "Approved",
        hrDecidedAt: now,
        hrRemarks: input.remarks ?? null,
        modifiedLwd: input.modifiedLwd ?? null,
        leaveEncashmentEligible: input.leaveEncashmentEligible,
        recoveryAmount: input.recoveryAmount != null ? String(input.recoveryAmount) : null,
        gratuityEligible: input.gratuityEligible,
        finalSettlementEligible: input.finalSettlementEligible,
        approvedBy: hrId,
        approvedAt: now,
        status: "HRApproved",
        currentStage: 2,
      })
      .where(eq(resignations.id, id))
      .returning();

    // Load employee facts for the case.
    const [emp] = await tx
      .select(EMP_FIELDS)
      .from(employees)
      .where(eq(employees.id, row.employeeId))
      .limit(1);

    const effectiveLwd = input.modifiedLwd ?? row.recommendedLwd ?? row.lastWorkingDate;
    const year = Number(row.submittedOn.slice(0, 4));
    const caseNumber = await nextCaseNumber(tx, year);

    const [createdCase] = await tx
      .insert(offboardingCases)
      .values({
        caseNumber,
        resignationId: row.id,
        employeeId: row.employeeId,
        departmentId: emp?.departmentId ?? null,
        reportingManagerId: emp?.reportingManagerId ?? row.managerId ?? null,
        dateOfJoining: emp?.joiningDate ?? null,
        resignationDate: row.submittedOn,
        lastWorkingDate: effectiveLwd,
        noticePeriodDays: row.noticePeriodDays,
        status: "OffboardingInitiated",
      })
      .returning();

    // Seed clearance tasks from the templates that apply to this employee's
    // department / sub-department (templates with no scope apply to everyone).
    const templates = await clearanceTemplatesForEmployee(row.employeeId);
    const taskRows: Array<typeof clearanceTasks.$inferInsert> = [];
    for (const t of templates) {
      const labels = Array.isArray(t.tasks) ? (t.tasks as string[]) : [];
      labels.forEach((label, i) =>
        taskRows.push({ caseId: createdCase!.id, team: t.team, label, sortOrder: i }),
      );
    }
    if (taskRows.length > 0) await tx.insert(clearanceTasks).values(taskRows);

    // Seed the exit-interview response from the template that best fits this
    // employee's department / sub-department / location (falling back to the
    // default/unscoped template) so they get the right pending survey.
    const exitTemplateId = await resolveExitTemplateIdForEmployee(row.employeeId);
    if (exitTemplateId != null) {
      await tx.insert(exitInterviewResponses).values({
        caseId: createdCase!.id,
        templateId: exitTemplateId,
        employeeId: row.employeeId,
        status: "Pending",
      });
    }

    writeAuditLogAsync(
      {
        actorEmployeeId: hrId,
        action: "RESIGNATION_APPROVED_BY_HR",
        entityType: "resignation",
        entityId: String(id),
        metadata: { caseNumber },
      },
      auditCtx,
    );
    writeAuditLogAsync(
      {
        actorEmployeeId: hrId,
        action: "OFFBOARDING_CASE_CREATED",
        entityType: "offboarding_case",
        entityId: String(createdCase!.id),
        metadata: { caseNumber, resignationId: row.id },
      },
      auditCtx,
    );
    notify(
      row.employeeId,
      "hr",
      "Your resignation is approved — offboarding has started",
      `Case ${caseNumber} created. Track progress on your profile.`,
    );
    return { resignation: updated!, case: createdCase! };
  });
}

export async function hrHold(hrId: number, id: number, remarks: string | null, auditCtx: AuditCtx) {
  const [row] = await db.select().from(resignations).where(eq(resignations.id, id)).limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (!["ManagerApproved", "OnHold"].includes(row.status)) {
    throw new ApiError(409, "CANNOT_HOLD", "Only manager-approved resignations can be put on hold.");
  }
  const [updated] = await db
    .update(resignations)
    .set({ status: "OnHold", hrId, hrRemarks: remarks ?? null })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: hrId,
      action: "RESIGNATION_ON_HOLD",
      entityType: "resignation",
      entityId: String(id),
    },
    auditCtx,
  );
  notify(row.employeeId, "hr", "Your resignation is on hold", remarks ?? undefined);
  return updated!;
}

// Resume a held resignation — returns it to the HR review queue (ManagerApproved)
// so HR can approve / reject / hold it again.
export async function hrResume(hrId: number, id: number, auditCtx: AuditCtx) {
  const [row] = await db.select().from(resignations).where(eq(resignations.id, id)).limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (row.status !== "OnHold") {
    throw new ApiError(409, "NOT_ON_HOLD", "Only an on-hold resignation can be resumed.");
  }
  const [updated] = await db
    .update(resignations)
    .set({ status: "ManagerApproved", hrId })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: hrId,
      action: "RESIGNATION_RESUMED",
      entityType: "resignation",
      entityId: String(id),
    },
    auditCtx,
  );
  notify(
    row.employeeId,
    "hr",
    "Your resignation is back under HR review",
    "The hold has been lifted.",
  );
  return updated!;
}

export async function hrReject(hrId: number, id: number, remarks: string | null, auditCtx: AuditCtx) {
  const [row] = await db.select().from(resignations).where(eq(resignations.id, id)).limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (!["ManagerApproved", "OnHold"].includes(row.status)) {
    throw new ApiError(409, "CANNOT_REJECT", "Only manager-approved resignations can be rejected by HR.");
  }
  const [updated] = await db
    .update(resignations)
    .set({ status: "Rejected", hrId, hrDecision: "Rejected", hrDecidedAt: new Date(), hrRemarks: remarks ?? null })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: hrId,
      action: "RESIGNATION_REJECTED_BY_HR",
      entityType: "resignation",
      entityId: String(id),
    },
    auditCtx,
  );
  notify(row.employeeId, "hr", "Your resignation was rejected by HR", remarks ?? undefined);
  return updated!;
}

// HR decides on a requested notice buyout. Approving waives the notice-period
// recovery (the FnF deduction is dropped); rejecting nudges the parties to
// discuss. Either way the employee is notified.
export async function hrBuyoutDecision(
  hrId: number,
  id: number,
  decision: "Approved" | "Rejected",
  note: string | null,
  auditCtx: AuditCtx,
) {
  const [row] = await db.select().from(resignations).where(eq(resignations.id, id)).limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Resignation not found.");
  if (!row.buyoutRequested) {
    throw new ApiError(409, "NO_BUYOUT", "This resignation has no notice buyout to decide on.");
  }
  if (row.buyoutStatus !== "Requested") {
    throw new ApiError(409, "BUYOUT_ALREADY_DECIDED", "The notice buyout has already been decided.");
  }
  if (["Rejected", "Withdrawn"].includes(row.status)) {
    throw new ApiError(409, "RESIGNATION_CLOSED", "This resignation is no longer active.");
  }
  const [updated] = await db
    .update(resignations)
    .set({ buyoutStatus: decision, buyoutDecisionNote: note ?? null })
    .where(eq(resignations.id, id))
    .returning();
  writeAuditLogAsync(
    {
      actorEmployeeId: hrId,
      action: "RESIGNATION_BUYOUT_DECISION",
      entityType: "resignation",
      entityId: String(id),
      metadata: { decision },
    },
    auditCtx,
  );

  // Reflect the decision in the Full & Final immediately if a settlement
  // already exists (otherwise it's applied when the FnF is first opened).
  const [cse] = await db
    .select({ id: offboardingCases.id })
    .from(offboardingCases)
    .where(eq(offboardingCases.resignationId, id))
    .limit(1);
  if (cse) {
    const [stl] = await db
      .select({ id: fnfSettlements.id })
      .from(fnfSettlements)
      .where(eq(fnfSettlements.caseId, cse.id))
      .limit(1);
    if (stl) await syncNoticeRecoveryLine(stl.id, id);
  }

  if (decision === "Approved") {
    notify(
      row.employeeId,
      "hr",
      "Your notice buyout was approved",
      note ?? "The notice buyout has been added to your final settlement.",
    );
  } else {
    notify(
      row.employeeId,
      "hr",
      "Your notice buyout was declined — let's discuss",
      note ?? "You'll serve your notice period; nothing is recovered in the settlement.",
    );
  }
  return updated!;
}

// ── Offboarding cases (Active Cases list) ──

export async function listCases() {
  const rows = await db
    .select({ c: offboardingCases, e: EMP_FIELDS, deptName: departments.name })
    .from(offboardingCases)
    .innerJoin(employees, eq(employees.id, offboardingCases.employeeId))
    .leftJoin(departments, eq(departments.id, offboardingCases.departmentId))
    .orderBy(desc(offboardingCases.createdAt));
  return rows.map(({ c, e, deptName }) => ({ ...c, employee: e, departmentName: deptName }));
}

export async function getCase(id: number) {
  const mgr = alias(employees, "case_mgr");
  const [row] = await db
    .select({
      c: offboardingCases,
      e: EMP_FIELDS,
      deptName: departments.name,
      subDeptName: subDepartments.name,
      mgrFirst: mgr.firstName,
      mgrLast: mgr.lastName,
      buyoutRequested: resignations.buyoutRequested,
      buyoutStatus: resignations.buyoutStatus,
      resignationReason: resignations.reason,
      fnfStatus: fnfSettlements.status,
    })
    .from(offboardingCases)
    .innerJoin(employees, eq(employees.id, offboardingCases.employeeId))
    .leftJoin(departments, eq(departments.id, offboardingCases.departmentId))
    .leftJoin(subDepartments, eq(subDepartments.id, employees.subDepartmentId))
    .leftJoin(mgr, eq(mgr.id, offboardingCases.reportingManagerId))
    .leftJoin(resignations, eq(resignations.id, offboardingCases.resignationId))
    .leftJoin(fnfSettlements, eq(fnfSettlements.caseId, offboardingCases.id))
    .where(eq(offboardingCases.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Offboarding case not found.");
  const managerName =
    row.mgrFirst || row.mgrLast
      ? `${row.mgrFirst ?? ""} ${row.mgrLast ?? ""}`.trim()
      : null;
  return {
    ...row.c,
    employee: row.e,
    departmentName: row.deptName,
    subDepartmentName: row.subDeptName,
    reportingManagerName: managerName,
    buyoutRequested: row.buyoutRequested ?? false,
    buyoutStatus: row.buyoutStatus ?? "None",
    resignationReason: row.resignationReason ?? null,
    fnfStatus: row.fnfStatus ?? null,
  };
}

// ── Clearance templates (admin config) ──

export type ClearanceScopeRow = { scopeType: "Department" | "SubDepartment"; scopeId: number };

async function loadTemplateScopes(templateIds: number[]) {
  if (templateIds.length === 0) return new Map<number, ClearanceScopeRow[]>();
  const rows = await db
    .select()
    .from(clearanceTemplateScope)
    .where(inArray(clearanceTemplateScope.templateId, templateIds));
  const byTemplate = new Map<number, ClearanceScopeRow[]>();
  for (const r of rows) {
    const arr = byTemplate.get(r.templateId) ?? [];
    arr.push({ scopeType: r.scopeType as ClearanceScopeRow["scopeType"], scopeId: r.scopeId });
    byTemplate.set(r.templateId, arr);
  }
  return byTemplate;
}

export async function listClearanceTemplates() {
  const templates = await db.select().from(clearanceTemplates).orderBy(clearanceTemplates.id);
  const scopes = await loadTemplateScopes(templates.map((t) => t.id));
  return templates.map((t) => ({ ...t, scope: scopes.get(t.id) ?? [] }));
}

// Derive a PascalCase team key from a display name (matches the built-in style
// e.g. "Legal Clearance" -> "LegalClearance"), capped at 40 chars.
function slugifyTeam(name: string): string {
  const base = name.replace(/[^A-Za-z0-9]+/g, "").slice(0, 40);
  return base || "Team";
}

async function replaceTemplateScope(
  tx: Tx,
  templateId: number,
  scope: ClearanceScopeRow[],
) {
  await tx.delete(clearanceTemplateScope).where(eq(clearanceTemplateScope.templateId, templateId));
  if (scope.length > 0) {
    await tx
      .insert(clearanceTemplateScope)
      .values(scope.map((s) => ({ templateId, scopeType: s.scopeType, scopeId: s.scopeId })));
  }
}

export async function createClearanceTemplate(input: {
  name: string;
  tasks: string[];
  isActive: boolean;
  scope?: ClearanceScopeRow[];
}) {
  // Generate a unique team key (the 6 built-ins already own their slugs).
  const existing = await db
    .select({ team: clearanceTemplates.team })
    .from(clearanceTemplates);
  const taken = new Set(existing.map((r) => r.team.toLowerCase()));
  const baseSlug = slugifyTeam(input.name);
  let team = baseSlug;
  let n = 2;
  while (taken.has(team.toLowerCase())) team = `${baseSlug}${n++}`;
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(clearanceTemplates)
        .values({
          team,
          name: input.name,
          tasks: input.tasks,
          isActive: input.isActive,
          isBuiltin: false,
        })
        .returning();
      await replaceTemplateScope(tx, row!.id, input.scope ?? []);
      return { ...row!, scope: input.scope ?? [] };
    });
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateClearanceTemplate(
  id: number,
  input: { name?: string; tasks?: string[]; isActive?: boolean; scope?: ClearanceScopeRow[] },
) {
  return db.transaction(async (tx) => {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.tasks !== undefined) patch.tasks = input.tasks;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    if (Object.keys(patch).length > 0) {
      const [exists] = await tx
        .update(clearanceTemplates)
        .set(patch)
        .where(eq(clearanceTemplates.id, id))
        .returning();
      if (!exists) throw new ApiError(404, "NOT_FOUND", "Clearance template not found.");
    }
    if (input.scope !== undefined) await replaceTemplateScope(tx, id, input.scope);
    const [row] = await tx
      .select()
      .from(clearanceTemplates)
      .where(eq(clearanceTemplates.id, id))
      .limit(1);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Clearance template not found.");
    const scopes = await loadTemplateScopes([id]);
    return { ...row, scope: scopes.get(id) ?? [] };
  });
}

// Active templates that apply to an employee: those with NO scope rows
// (company-wide) OR a scope row matching the employee's department/sub-department.
export async function clearanceTemplatesForEmployee(employeeId: number) {
  const [emp] = await db
    .select({ departmentId: employees.departmentId, subDepartmentId: employees.subDepartmentId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  const templates = await db
    .select()
    .from(clearanceTemplates)
    .where(eq(clearanceTemplates.isActive, true));
  const scopes = await loadTemplateScopes(templates.map((t) => t.id));
  return templates.filter((t) => {
    const rows = scopes.get(t.id) ?? [];
    if (rows.length === 0) return true; // company-wide
    return rows.some(
      (s) =>
        (s.scopeType === "Department" && s.scopeId === emp?.departmentId) ||
        (s.scopeType === "SubDepartment" && s.scopeId === emp?.subDepartmentId),
    );
  });
}

export async function deleteClearanceTemplate(id: number) {
  const [tmpl] = await db
    .select()
    .from(clearanceTemplates)
    .where(eq(clearanceTemplates.id, id))
    .limit(1);
  if (!tmpl) throw new ApiError(404, "NOT_FOUND", "Clearance template not found.");
  if (tmpl.isBuiltin) {
    throw new ApiError(400, "BUILTIN_TEMPLATE", "Built-in clearance teams cannot be deleted.");
  }
  await db.delete(clearanceTemplates).where(eq(clearanceTemplates.id, id));
  return tmpl;
}

// ── Case clearance (runtime) ──

export type ClearanceTeamGroup = {
  team: string;
  status: "Pending" | "InProgress" | "Completed";
  tasks: Array<{
    id: number;
    label: string;
    status: "Pending" | "Completed" | "NA";
    remarks: string | null;
    completedAt: Date | null;
  }>;
};

function teamStatus(
  tasks: Array<{ status: string }>,
): "Pending" | "InProgress" | "Completed" {
  if (tasks.length === 0) return "Completed";
  const done = tasks.filter((t) => t.status === "Completed" || t.status === "NA").length;
  if (done === 0) return "Pending";
  if (done === tasks.length) return "Completed";
  return "InProgress";
}

export async function getCaseClearance(caseId: number) {
  // 404 if the case doesn't exist.
  await getCase(caseId);
  const rows = await db
    .select()
    .from(clearanceTasks)
    .where(eq(clearanceTasks.caseId, caseId))
    .orderBy(clearanceTasks.team, clearanceTasks.sortOrder, clearanceTasks.id);

  const byTeam = new Map<string, ClearanceTeamGroup["tasks"]>();
  for (const r of rows) {
    const list = byTeam.get(r.team) ?? [];
    list.push({
      id: r.id,
      label: r.label,
      status: r.status,
      remarks: r.remarks,
      completedAt: r.completedAt,
    });
    byTeam.set(r.team, list);
  }
  const groups: ClearanceTeamGroup[] = [];
  for (const [team, tasks] of byTeam.entries()) {
    groups.push({ team, status: teamStatus(tasks), tasks });
  }
  const total = rows.length;
  const done = rows.filter((r) => r.status === "Completed" || r.status === "NA").length;
  return {
    caseId,
    groups,
    summary: { total, done, allComplete: total > 0 && done === total },
  };
}

export async function updateClearanceTask(
  caseId: number,
  taskId: number,
  input: { status?: "Pending" | "Completed" | "NA"; remarks?: string | null },
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  const [task] = await db
    .select()
    .from(clearanceTasks)
    .where(and(eq(clearanceTasks.id, taskId), eq(clearanceTasks.caseId, caseId)))
    .limit(1);
  if (!task) throw new ApiError(404, "NOT_FOUND", "Clearance task not found.");

  const status = input.status ?? task.status;
  const completing = status === "Completed";
  await db
    .update(clearanceTasks)
    .set({
      status,
      remarks: input.remarks !== undefined ? input.remarks : task.remarks,
      completedBy: completing ? actorEmpId : null,
      completedAt: completing ? new Date() : null,
    })
    .where(eq(clearanceTasks.id, taskId));

  writeAuditLogAsync(
    {
      actorEmployeeId: actorEmpId,
      action: "OFFBOARDING_CLEARANCE_UPDATED",
      entityType: "offboarding_case",
      entityId: String(caseId),
      metadata: { taskId, team: task.team, label: task.label, status },
    },
    auditCtx,
  );

  // Auto-advance the case when every task is Completed/NA.
  const clearance = await getCaseClearance(caseId);
  if (clearance.summary.allComplete) {
    const [cse] = await db
      .select({ status: offboardingCases.status })
      .from(offboardingCases)
      .where(eq(offboardingCases.id, caseId))
      .limit(1);
    if (cse?.status === "OffboardingInitiated") {
      await db
        .update(offboardingCases)
        .set({ status: "ClearancesComplete" })
        .where(eq(offboardingCases.id, caseId));
      writeAuditLogAsync(
        {
          actorEmployeeId: actorEmpId,
          action: "OFFBOARDING_CLEARANCES_COMPLETE",
          entityType: "offboarding_case",
          entityId: String(caseId),
        },
        auditCtx,
      );
    }
  }
  return clearance;
}

// ── My Clearances — per-team scoped view for managers / team members ──

// Which clearance teams the current user may view/complete, given their
// permission codes and whether they are the reporting manager of a case.
// `admin.roles` (super admin) → every team. Per-team permissions → that team.
// Reporting-Manager team → only when the user is the case's reporting manager.
export function accessibleClearanceTeams(
  permCodes: Set<string>,
  isReportingManager: boolean,
): Set<string> {
  const teams = new Set<string>();
  const superAdmin = permCodes.has("admin.roles");
  for (const [team, perm] of Object.entries(CLEARANCE_TEAM_PERMISSION)) {
    if (superAdmin || permCodes.has(perm)) teams.add(team);
  }
  if (superAdmin || isReportingManager) teams.add("ReportingManager");
  return teams;
}

// Active (non-closed) offboarding cases that have clearance tasks the current
// user can act on, with only those tasks included.
export async function getMyClearances(employeeId: number, permCodes: Set<string>) {
  const cases = await db
    .select({ c: offboardingCases, e: EMP_FIELDS, deptName: departments.name })
    .from(offboardingCases)
    .innerJoin(employees, eq(employees.id, offboardingCases.employeeId))
    .leftJoin(departments, eq(departments.id, offboardingCases.departmentId))
    .where(ne(offboardingCases.status, "Closed"))
    .orderBy(desc(offboardingCases.createdAt));
  if (cases.length === 0) return [];

  const caseIds = cases.map((r) => r.c.id);
  const tasks = await db
    .select()
    .from(clearanceTasks)
    .where(inArray(clearanceTasks.caseId, caseIds))
    .orderBy(clearanceTasks.team, clearanceTasks.sortOrder, clearanceTasks.id);
  const byCase = new Map<number, typeof tasks>();
  for (const t of tasks) {
    const arr = byCase.get(t.caseId) ?? [];
    arr.push(t);
    byCase.set(t.caseId, arr);
  }

  // Super admins see every team (including custom areas with no dedicated
  // permission); everyone else is scoped to their accessible teams.
  const superAdmin = permCodes.has("admin.roles");
  const result = [];
  for (const row of cases) {
    const isRM = row.c.reportingManagerId === employeeId;
    const teams = accessibleClearanceTeams(permCodes, isRM);
    if (!superAdmin && teams.size === 0) continue;

    const mine = (byCase.get(row.c.id) ?? []).filter(
      (t) => superAdmin || teams.has(t.team),
    );
    if (mine.length === 0) continue;

    const groupMap = new Map<string, ClearanceTeamGroup["tasks"]>();
    for (const t of mine) {
      const list = groupMap.get(t.team) ?? [];
      list.push({ id: t.id, label: t.label, status: t.status, remarks: t.remarks, completedAt: t.completedAt });
      groupMap.set(t.team, list);
    }
    const groups: ClearanceTeamGroup[] = [];
    for (const [team, list] of groupMap.entries()) {
      groups.push({ team, status: teamStatus(list), tasks: list });
    }
    const done = mine.filter((t) => t.status === "Completed" || t.status === "NA").length;
    result.push({
      caseId: row.c.id,
      caseNumber: row.c.caseNumber,
      status: row.c.status,
      lastWorkingDate: row.c.lastWorkingDate,
      departmentName: row.deptName,
      employee: row.e,
      groups,
      summary: { total: mine.length, done },
    });
  }
  return result;
}

// Update a single clearance task as a team member — authorised only if the
// task's team is one the user can act on for that case.
export async function updateMyClearanceTask(
  employeeId: number,
  permCodes: Set<string>,
  caseId: number,
  taskId: number,
  input: { status?: "Pending" | "Completed" | "NA"; remarks?: string | null },
  auditCtx: AuditCtx,
) {
  const [task] = await db
    .select({ team: clearanceTasks.team })
    .from(clearanceTasks)
    .where(and(eq(clearanceTasks.id, taskId), eq(clearanceTasks.caseId, caseId)))
    .limit(1);
  if (!task) throw new ApiError(404, "NOT_FOUND", "Clearance task not found.");

  const [cse] = await db
    .select({ rm: offboardingCases.reportingManagerId })
    .from(offboardingCases)
    .where(eq(offboardingCases.id, caseId))
    .limit(1);
  const isRM = cse?.rm === employeeId;
  const teams = accessibleClearanceTeams(permCodes, isRM);
  if (!permCodes.has("admin.roles") && !teams.has(task.team)) {
    throw new ApiError(403, "FORBIDDEN", "You are not allowed to update this team's clearance.");
  }

  await updateClearanceTask(caseId, taskId, input, employeeId, auditCtx);
  return getMyClearances(employeeId, permCodes);
}

// ── Exit interview (Phase 3) ──

export type ExitQuestionType =
  | "yes_no"
  | "nps"
  | "star"
  | "rating_scale"
  | "single_choice"
  | "multiple_choice"
  | "comments"
  | "date";

export type ExitQuestion = {
  id: string;
  type: ExitQuestionType;
  label: string;
  required: boolean;
  options?: string[];
  scaleMax?: number;
};

type ExitTemplateInput = {
  name: string;
  description?: string | null;
  questions: ExitQuestion[];
  isActive: boolean;
  isDefault: boolean;
  scope?: ExitScopeRow[];
};

// ── Exit-interview template scoping (Company | Branch | Department | SubDepartment) ──

export type ExitScopeRow = {
  scopeType: "Company" | "Branch" | "Department" | "SubDepartment";
  scopeId: number | null;
};

async function loadExitTemplateScopes(templateIds: number[]) {
  if (templateIds.length === 0) return new Map<number, ExitScopeRow[]>();
  const rows = await db
    .select()
    .from(exitInterviewTemplateScope)
    .where(inArray(exitInterviewTemplateScope.templateId, templateIds));
  const byTemplate = new Map<number, ExitScopeRow[]>();
  for (const r of rows) {
    const arr = byTemplate.get(r.templateId) ?? [];
    arr.push({ scopeType: r.scopeType as ExitScopeRow["scopeType"], scopeId: r.scopeId });
    byTemplate.set(r.templateId, arr);
  }
  return byTemplate;
}

async function replaceExitTemplateScope(tx: Tx, templateId: number, scope: ExitScopeRow[]) {
  await tx
    .delete(exitInterviewTemplateScope)
    .where(eq(exitInterviewTemplateScope.templateId, templateId));
  const rows = scope.filter((s) => s.scopeType === "Company" || s.scopeId != null);
  if (rows.length > 0) {
    await tx.insert(exitInterviewTemplateScope).values(
      rows.map((s) => ({
        templateId,
        scopeType: s.scopeType,
        // Company scope has no id; store 0 as a placeholder (matches-everyone).
        scopeId: s.scopeId ?? 0,
      })),
    );
  }
}

// Pick the single exit-interview template that best fits an employee: the most
// specific active template whose scope matches (SubDepartment > Department >
// Branch > Company), falling back to an unscoped/default active template.
async function resolveExitTemplateIdForEmployee(employeeId: number): Promise<number | null> {
  const [emp] = await db
    .select({
      branchId: employees.branchId,
      departmentId: employees.departmentId,
      subDepartmentId: employees.subDepartmentId,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  const templates = await db
    .select()
    .from(exitInterviewTemplates)
    .where(eq(exitInterviewTemplates.isActive, true))
    .orderBy(desc(exitInterviewTemplates.isDefault), exitInterviewTemplates.id);
  if (templates.length === 0) return null;

  const scopes = await loadExitTemplateScopes(templates.map((t) => t.id));
  const SPECIFICITY: Record<string, number> = {
    SubDepartment: 4,
    Department: 3,
    Branch: 2,
    Company: 1,
  };
  const facet = (t: string): number | null =>
    t === "SubDepartment"
      ? emp?.subDepartmentId ?? null
      : t === "Department"
        ? emp?.departmentId ?? null
        : t === "Branch"
          ? emp?.branchId ?? null
          : null;

  let best: { id: number; spec: number; isDefault: boolean } | null = null;
  let unscoped: { id: number; isDefault: boolean } | null = null;
  for (const t of templates) {
    const rows = scopes.get(t.id) ?? [];
    if (rows.length === 0) {
      // Catch-all template; remember the best (default-first ordering above).
      if (!unscoped) unscoped = { id: t.id, isDefault: t.isDefault };
      continue;
    }
    for (const r of rows) {
      const matches = r.scopeType === "Company" || facet(r.scopeType) === r.scopeId;
      if (!matches) continue;
      const spec = SPECIFICITY[r.scopeType] ?? 0;
      if (!best || spec > best.spec) best = { id: t.id, spec, isDefault: t.isDefault };
    }
  }
  return best?.id ?? unscoped?.id ?? templates[0]!.id;
}

export async function listExitInterviewTemplates() {
  const templates = await db
    .select()
    .from(exitInterviewTemplates)
    .orderBy(desc(exitInterviewTemplates.updatedAt));
  const scopes = await loadExitTemplateScopes(templates.map((t) => t.id));
  return templates.map((t) => ({
    ...t,
    scope: (scopes.get(t.id) ?? []).map((s) => ({
      scopeType: s.scopeType,
      // Surface Company scope as null id for the client.
      scopeId: s.scopeType === "Company" ? null : s.scopeId,
    })),
  }));
}

export async function getExitInterviewTemplate(id: number) {
  const [row] = await db
    .select()
    .from(exitInterviewTemplates)
    .where(eq(exitInterviewTemplates.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Exit interview template not found.");
  return row;
}

export async function createExitInterviewTemplate(
  input: ExitTemplateInput,
  createdBy: number | null,
) {
  try {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(exitInterviewTemplates)
          .set({ isDefault: false })
          .where(eq(exitInterviewTemplates.isDefault, true));
      }
      const [row] = await tx
        .insert(exitInterviewTemplates)
        .values({
          name: input.name,
          description: input.description ?? null,
          questions: input.questions,
          isActive: input.isActive,
          isDefault: input.isDefault,
          createdBy,
        })
        .returning();
      if (input.scope) await replaceExitTemplateScope(tx, row!.id, input.scope);
      return row!;
    });
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateExitInterviewTemplate(
  id: number,
  input: Partial<ExitTemplateInput>,
) {
  await getExitInterviewTemplate(id);
  try {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(exitInterviewTemplates)
          .set({ isDefault: false })
          .where(
            and(
              eq(exitInterviewTemplates.isDefault, true),
              sql`${exitInterviewTemplates.id} <> ${id}`,
            ),
          );
      }
      const patch: Record<string, unknown> = {};
      for (const k of ["name", "description", "questions", "isActive", "isDefault"] as const) {
        if (input[k] !== undefined) patch[k] = input[k];
      }
      const [row] = await tx
        .update(exitInterviewTemplates)
        .set(patch)
        .where(eq(exitInterviewTemplates.id, id))
        .returning();
      if (input.scope) await replaceExitTemplateScope(tx, id, input.scope);
      return row!;
    });
  } catch (e) {
    wrapDbError(e);
  }
}

export async function deleteExitInterviewTemplate(id: number) {
  const [row] = await db
    .delete(exitInterviewTemplates)
    .where(eq(exitInterviewTemplates.id, id))
    .returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Exit interview template not found.");
  return row;
}

async function loadResponseWithTemplate(responseId: number) {
  const [row] = await db
    .select({ r: exitInterviewResponses, t: exitInterviewTemplates })
    .from(exitInterviewResponses)
    .leftJoin(
      exitInterviewTemplates,
      eq(exitInterviewTemplates.id, exitInterviewResponses.templateId),
    )
    .where(eq(exitInterviewResponses.id, responseId))
    .limit(1);
  if (!row) return null;
  return {
    ...row.r,
    template: row.t
      ? { id: row.t.id, name: row.t.name, description: row.t.description, questions: row.t.questions }
      : null,
  };
}

// Employee: the latest exit-interview assigned to them (pending or completed).
export async function getMyExitInterview(employeeId: number) {
  const [row] = await db
    .select({ id: exitInterviewResponses.id })
    .from(exitInterviewResponses)
    .where(eq(exitInterviewResponses.employeeId, employeeId))
    .orderBy(desc(exitInterviewResponses.createdAt))
    .limit(1);
  if (!row) return null;
  return loadResponseWithTemplate(row.id);
}

export async function submitMyExitInterview(
  employeeId: number,
  responseId: number,
  answers: Record<string, unknown>,
  auditCtx: AuditCtx,
) {
  const [resp] = await db
    .select()
    .from(exitInterviewResponses)
    .where(
      and(
        eq(exitInterviewResponses.id, responseId),
        eq(exitInterviewResponses.employeeId, employeeId),
      ),
    )
    .limit(1);
  if (!resp) throw new ApiError(404, "NOT_FOUND", "Exit interview not found.");
  if (resp.status === "Completed") {
    throw new ApiError(409, "ALREADY_SUBMITTED", "Exit interview already submitted.");
  }

  const [updated] = await db
    .update(exitInterviewResponses)
    .set({ answers, status: "Completed", submittedAt: new Date() })
    .where(eq(exitInterviewResponses.id, responseId))
    .returning();

  writeAuditLogAsync(
    {
      actorEmployeeId: employeeId,
      action: "EXIT_INTERVIEW_SUBMITTED",
      entityType: "offboarding_case",
      entityId: String(resp.caseId),
      metadata: { responseId },
    },
    auditCtx,
  );

  // Auto-complete the HR "Exit Interview" clearance task for this case.
  const [task] = await db
    .select({ id: clearanceTasks.id })
    .from(clearanceTasks)
    .where(
      and(
        eq(clearanceTasks.caseId, resp.caseId),
        eq(clearanceTasks.team, "HR"),
        eq(clearanceTasks.label, "Exit Interview"),
      ),
    )
    .limit(1);
  if (task) {
    await updateClearanceTask(
      resp.caseId,
      task.id,
      { status: "Completed" },
      employeeId,
      auditCtx,
    ).catch(() => {
      /* non-critical */
    });
  }

  return updated!;
}

// HR / admin: a case's exit-interview response + its template.
export async function getCaseExitInterview(caseId: number) {
  await getCase(caseId);
  const [row] = await db
    .select({ id: exitInterviewResponses.id })
    .from(exitInterviewResponses)
    .where(eq(exitInterviewResponses.caseId, caseId))
    .limit(1);
  if (!row) return null;
  return loadResponseWithTemplate(row.id);
}

// ── Full & Final settlement (Phase 4) ──

// Lazily create the settlement (+ starter line items derived from the HR
// eligibility flags) the first time a case's FnF is opened. Works for cases
// created before Phase 4 too.
async function ensureFnfForCase(caseId: number): Promise<number> {
  const [existing] = await db
    .select({ id: fnfSettlements.id })
    .from(fnfSettlements)
    .where(eq(fnfSettlements.caseId, caseId))
    .limit(1);
  if (existing) return existing.id;

  const [cse] = await db
    .select({ employeeId: offboardingCases.employeeId, resignationId: offboardingCases.resignationId })
    .from(offboardingCases)
    .where(eq(offboardingCases.id, caseId))
    .limit(1);
  if (!cse) throw new ApiError(404, "NOT_FOUND", "Offboarding case not found.");

  const [res] = await db
    .select({
      leaveEncashmentEligible: resignations.leaveEncashmentEligible,
      gratuityEligible: resignations.gratuityEligible,
      recoveryAmount: resignations.recoveryAmount,
      buyoutStatus: resignations.buyoutStatus,
    })
    .from(resignations)
    .where(eq(resignations.id, cse.resignationId))
    .limit(1);

  const [settlement] = await db
    .insert(fnfSettlements)
    .values({ caseId, employeeId: cse.employeeId, status: "Processing" })
    .returning();

  const days = await openLeaveDays(cse.employeeId);
  const lines: Array<typeof fnfLineItems.$inferInsert> = [
    { settlementId: settlement!.id, kind: "Earning", label: "Pending Salary", amount: "0", sortOrder: 0 },
  ];
  if (res?.leaveEncashmentEligible) {
    lines.push({
      settlementId: settlement!.id,
      kind: "Earning",
      label: `Leave Encashment (${days} day${days === 1 ? "" : "s"})`,
      amount: "0",
      sortOrder: 1,
    });
  }
  if (res?.gratuityEligible) {
    lines.push({ settlementId: settlement!.id, kind: "Earning", label: "Gratuity", amount: "0", sortOrder: 2 });
  }
  await db.insert(fnfLineItems).values(lines);
  // The notice-recovery / buyout deduction is managed dynamically by
  // syncNoticeRecoveryLine (called on every FnF open + on buyout decision), so
  // it's not seeded here.
  await syncNoticeRecoveryLine(settlement!.id, cse.resignationId);
  return settlement!.id;
}

// Keep the auto-managed notice recovery / buyout deduction in sync with the
// resignation's current state. Called whenever the FnF is opened and the moment
// a buyout decision is made, so the line is always correct (dynamic). A notice
// buyout that's approved is added to the settlement as the employee's payment
// for the notice they bought out; a rejected buyout adds nothing (they serve
// the notice). A plain recovery (no buyout requested) shows as "Recovery".
async function syncNoticeRecoveryLine(settlementId: number, resignationId: number) {
  const [s] = await db
    .select({ status: fnfSettlements.status })
    .from(fnfSettlements)
    .where(eq(fnfSettlements.id, settlementId))
    .limit(1);
  if (!s || s.status !== "Processing") return; // never touch approved/paid settlements

  const [res] = await db
    .select({
      recoveryAmount: resignations.recoveryAmount,
      buyoutRequested: resignations.buyoutRequested,
      buyoutStatus: resignations.buyoutStatus,
    })
    .from(resignations)
    .where(eq(resignations.id, resignationId))
    .limit(1);

  const amount = Number(res?.recoveryAmount ?? 0);
  // Active when there's an amount and the buyout wasn't rejected (a rejected
  // buyout means the employee serves the notice, so nothing is recovered).
  const active = amount > 0 && res?.buyoutStatus !== "Rejected";
  const label = res?.buyoutRequested ? "Notice Buyout" : "Recovery";

  const existing = await db
    .select({ id: fnfLineItems.id })
    .from(fnfLineItems)
    .where(
      and(
        eq(fnfLineItems.settlementId, settlementId),
        inArray(fnfLineItems.label, ["Recovery", "Notice Buyout"]),
      ),
    );

  if (!active) {
    if (existing.length > 0) {
      await db.delete(fnfLineItems).where(
        inArray(fnfLineItems.id, existing.map((e) => e.id)),
      );
    }
    return;
  }

  if (existing.length === 0) {
    await db.insert(fnfLineItems).values({
      settlementId,
      kind: "Deduction",
      label,
      amount: String(amount),
      sortOrder: 3,
    });
  } else {
    const [first, ...extra] = existing;
    await db
      .update(fnfLineItems)
      .set({ kind: "Deduction", label, amount: String(amount) })
      .where(eq(fnfLineItems.id, first!.id));
    if (extra.length > 0) {
      await db.delete(fnfLineItems).where(
        inArray(fnfLineItems.id, extra.map((e) => e.id)),
      );
    }
  }
}

function fnfTotals(lines: Array<{ kind: string; amount: string }>) {
  let earnings = 0;
  let deductions = 0;
  for (const l of lines) {
    const a = Number(l.amount) || 0;
    if (l.kind === "Earning") earnings += a;
    else deductions += a;
  }
  return {
    totalEarnings: Math.round(earnings * 100) / 100,
    totalDeductions: Math.round(deductions * 100) / 100,
    netAmount: Math.round((earnings - deductions) * 100) / 100,
  };
}

export async function getCaseFnf(caseId: number) {
  await getCase(caseId);
  const settlementId = await ensureFnfForCase(caseId);
  // Re-sync the notice buyout / recovery deduction so it always reflects the
  // current buyout decision, even if the buyout was decided after the FnF was
  // first opened.
  const [cse] = await db
    .select({ resignationId: offboardingCases.resignationId })
    .from(offboardingCases)
    .where(eq(offboardingCases.id, caseId))
    .limit(1);
  if (cse) await syncNoticeRecoveryLine(settlementId, cse.resignationId);
  const [settlement] = await db
    .select()
    .from(fnfSettlements)
    .where(eq(fnfSettlements.id, settlementId))
    .limit(1);
  const lines = await db
    .select()
    .from(fnfLineItems)
    .where(eq(fnfLineItems.settlementId, settlementId))
    .orderBy(fnfLineItems.kind, fnfLineItems.sortOrder, fnfLineItems.id);
  return { settlement: settlement!, lines, totals: fnfTotals(lines) };
}

function assertFnfEditable(status: string) {
  if (status !== "Processing") {
    throw new ApiError(409, "FNF_LOCKED", "Settlement is approved/paid and can no longer be edited.");
  }
}

async function loadSettlementForCase(caseId: number) {
  const [s] = await db
    .select()
    .from(fnfSettlements)
    .where(eq(fnfSettlements.caseId, caseId))
    .limit(1);
  if (!s) throw new ApiError(404, "NOT_FOUND", "Settlement not found.");
  return s;
}

export async function addFnfLine(
  caseId: number,
  input: { kind: "Earning" | "Deduction"; label: string; amount: number },
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  const settlementId = await ensureFnfForCase(caseId);
  const s = await loadSettlementForCase(caseId);
  assertFnfEditable(s.status);
  await db.insert(fnfLineItems).values({
    settlementId,
    kind: input.kind,
    label: input.label,
    amount: String(input.amount),
    sortOrder: 100,
  });
  writeAuditLogAsync(
    { actorEmployeeId: actorEmpId, action: "OFFBOARDING_FNF_UPDATED", entityType: "offboarding_case", entityId: String(caseId) },
    auditCtx,
  );
  return getCaseFnf(caseId);
}

export async function updateFnfLine(
  caseId: number,
  lineId: number,
  input: { label?: string; amount?: number },
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  const s = await loadSettlementForCase(caseId);
  assertFnfEditable(s.status);
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label;
  if (input.amount !== undefined) patch.amount = String(input.amount);
  const [row] = await db
    .update(fnfLineItems)
    .set(patch)
    .where(and(eq(fnfLineItems.id, lineId), eq(fnfLineItems.settlementId, s.id)))
    .returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Line item not found.");
  writeAuditLogAsync(
    { actorEmployeeId: actorEmpId, action: "OFFBOARDING_FNF_UPDATED", entityType: "offboarding_case", entityId: String(caseId) },
    auditCtx,
  );
  return getCaseFnf(caseId);
}

export async function deleteFnfLine(
  caseId: number,
  lineId: number,
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  const s = await loadSettlementForCase(caseId);
  assertFnfEditable(s.status);
  const [row] = await db
    .delete(fnfLineItems)
    .where(and(eq(fnfLineItems.id, lineId), eq(fnfLineItems.settlementId, s.id)))
    .returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Line item not found.");
  writeAuditLogAsync(
    { actorEmployeeId: actorEmpId, action: "OFFBOARDING_FNF_UPDATED", entityType: "offboarding_case", entityId: String(caseId) },
    auditCtx,
  );
  return getCaseFnf(caseId);
}

export async function updateFnfNotes(caseId: number, notes: string | null) {
  const s = await loadSettlementForCase(caseId);
  await db.update(fnfSettlements).set({ notes }).where(eq(fnfSettlements.id, s.id));
  return getCaseFnf(caseId);
}

export async function approveFnf(caseId: number, actorEmpId: number | null, auditCtx: AuditCtx) {
  const s = await loadSettlementForCase(caseId);
  if (s.status !== "Processing") {
    throw new ApiError(409, "BAD_STATE", "Only a processing settlement can be approved.");
  }
  await db
    .update(fnfSettlements)
    .set({ status: "Approved", approvedBy: actorEmpId, approvedAt: new Date() })
    .where(eq(fnfSettlements.id, s.id));
  writeAuditLogAsync(
    { actorEmployeeId: actorEmpId, action: "OFFBOARDING_FNF_APPROVED", entityType: "offboarding_case", entityId: String(caseId) },
    auditCtx,
  );
  return getCaseFnf(caseId);
}

export async function payFnf(caseId: number, actorEmpId: number | null, auditCtx: AuditCtx) {
  const s = await loadSettlementForCase(caseId);
  if (s.status !== "Approved") {
    throw new ApiError(409, "BAD_STATE", "Settlement must be approved before it can be marked paid.");
  }
  await db
    .update(fnfSettlements)
    .set({ status: "Paid", paidBy: actorEmpId, paidAt: new Date() })
    .where(eq(fnfSettlements.id, s.id));

  // Advance the case to FnFComplete (unless already closed).
  const [cse] = await db
    .select({ status: offboardingCases.status })
    .from(offboardingCases)
    .where(eq(offboardingCases.id, caseId))
    .limit(1);
  if (cse && cse.status !== "Closed") {
    await db
      .update(offboardingCases)
      .set({ status: "FnFComplete" })
      .where(eq(offboardingCases.id, caseId));
  }
  writeAuditLogAsync(
    { actorEmployeeId: actorEmpId, action: "OFFBOARDING_FNF_PAID", entityType: "offboarding_case", entityId: String(caseId) },
    auditCtx,
  );
  return getCaseFnf(caseId);
}

// ── Exit documents (Phase 5) ──

const COMPANY_NAME = "iLeads Auxiliary Services Pvt Ltd";

function fmtLongDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Collect the substitution variables for a case.
async function loadDocumentVariables(caseId: number): Promise<Record<string, string>> {
  const [row] = await db
    .select({
      c: offboardingCases,
      empId: employees.empId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      deptName: departments.name,
      desigName: designations.name,
    })
    .from(offboardingCases)
    .innerJoin(employees, eq(employees.id, offboardingCases.employeeId))
    .leftJoin(departments, eq(departments.id, offboardingCases.departmentId))
    .leftJoin(designations, eq(designations.id, employees.designationId))
    .where(eq(offboardingCases.id, caseId))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Offboarding case not found.");

  // Net settlement, if a settlement exists.
  let netSettlement = "-";
  const [settlement] = await db
    .select({ id: fnfSettlements.id })
    .from(fnfSettlements)
    .where(eq(fnfSettlements.caseId, caseId))
    .limit(1);
  if (settlement) {
    const lines = await db
      .select({ kind: fnfLineItems.kind, amount: fnfLineItems.amount })
      .from(fnfLineItems)
      .where(eq(fnfLineItems.settlementId, settlement.id));
    const { netAmount } = fnfTotals(lines);
    netSettlement = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(netAmount);
  }

  return {
    companyName: COMPANY_NAME,
    employeeName: `${row.firstName} ${row.lastName}`.trim(),
    empId: row.empId,
    designation: row.desigName ?? "-",
    department: row.deptName ?? "-",
    dateOfJoining: fmtLongDate(row.c.dateOfJoining),
    resignationDate: fmtLongDate(row.c.resignationDate),
    lastWorkingDate: fmtLongDate(row.c.lastWorkingDate),
    noticePeriodDays: String(row.c.noticePeriodDays ?? "-"),
    caseNumber: row.c.caseNumber,
    currentDate: fmtLongDate(todayIso()),
    netSettlement,
  };
}

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    key in vars ? vars[key]! : `{{${key}}}`,
  );
}

export const EXIT_DOCUMENT_VARIABLES = [
  "companyName",
  "employeeName",
  "empId",
  "designation",
  "department",
  "dateOfJoining",
  "resignationDate",
  "lastWorkingDate",
  "noticePeriodDays",
  "caseNumber",
  "currentDate",
  "netSettlement",
] as const;

type DocTemplateInput = {
  name: string;
  category: "HR" | "Finance" | "Employee";
  htmlTemplate: string;
  isActive: boolean;
  sortOrder: number;
};

export async function listDocumentTemplates() {
  return db
    .select()
    .from(exitDocumentTemplates)
    .orderBy(exitDocumentTemplates.sortOrder, exitDocumentTemplates.id);
}

export async function createDocumentTemplate(input: DocTemplateInput) {
  try {
    const [row] = await db.insert(exitDocumentTemplates).values(input).returning();
    return row!;
  } catch (e) {
    wrapDbError(e);
  }
}

export async function updateDocumentTemplate(id: number, input: Partial<DocTemplateInput>) {
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "category", "htmlTemplate", "isActive", "sortOrder"] as const) {
    if (input[k] !== undefined) patch[k] = input[k];
  }
  const [row] = await db
    .update(exitDocumentTemplates)
    .set(patch)
    .where(eq(exitDocumentTemplates.id, id))
    .returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Document template not found.");
  return row;
}

export async function deleteDocumentTemplate(id: number) {
  const [row] = await db
    .delete(exitDocumentTemplates)
    .where(eq(exitDocumentTemplates.id, id))
    .returning();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Document template not found.");
  return row;
}

// For a case: every active template + its generated document (if any).
export async function getCaseDocuments(caseId: number) {
  await getCase(caseId);
  const templates = await db
    .select()
    .from(exitDocumentTemplates)
    .where(eq(exitDocumentTemplates.isActive, true))
    .orderBy(exitDocumentTemplates.sortOrder, exitDocumentTemplates.id);
  const docs = await db
    .select()
    .from(exitDocuments)
    .where(eq(exitDocuments.caseId, caseId));
  const byTemplate = new Map<number | null, (typeof docs)[number]>();
  for (const d of docs) byTemplate.set(d.templateId, d);
  return templates.map((t) => {
    const doc = byTemplate.get(t.id);
    return {
      templateId: t.id,
      name: t.name,
      category: t.category,
      sortOrder: t.sortOrder,
      document: doc
        ? {
            id: doc.id,
            status: doc.status,
            generatedAt: doc.generatedAt,
            sentAt: doc.sentAt,
          }
        : null,
    };
  });
}

export async function generateDocument(
  caseId: number,
  templateId: number,
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  const [tmpl] = await db
    .select()
    .from(exitDocumentTemplates)
    .where(eq(exitDocumentTemplates.id, templateId))
    .limit(1);
  if (!tmpl) throw new ApiError(404, "NOT_FOUND", "Document template not found.");

  const vars = await loadDocumentVariables(caseId);
  const renderedHtml = renderTemplate(tmpl.htmlTemplate, vars);

  // Upsert (regenerate replaces the existing snapshot).
  const [doc] = await db
    .insert(exitDocuments)
    .values({
      caseId,
      templateId,
      name: tmpl.name,
      category: tmpl.category,
      renderedHtml,
      status: "Generated",
      generatedBy: actorEmpId,
      generatedAt: new Date(),
      sentAt: null,
    })
    .onConflictDoUpdate({
      target: [exitDocuments.caseId, exitDocuments.templateId],
      set: {
        name: tmpl.name,
        category: tmpl.category,
        renderedHtml,
        status: "Generated",
        generatedBy: actorEmpId,
        generatedAt: new Date(),
        sentAt: null,
      },
    })
    .returning();

  writeAuditLogAsync(
    {
      actorEmployeeId: actorEmpId,
      action: "OFFBOARDING_DOCUMENT_GENERATED",
      entityType: "offboarding_case",
      entityId: String(caseId),
      metadata: { templateId, name: tmpl.name },
    },
    auditCtx,
  );
  return doc!;
}

export async function getDocument(caseId: number, docId: number) {
  const [doc] = await db
    .select()
    .from(exitDocuments)
    .where(and(eq(exitDocuments.id, docId), eq(exitDocuments.caseId, caseId)))
    .limit(1);
  if (!doc) throw new ApiError(404, "NOT_FOUND", "Document not found.");
  return doc;
}

export async function sendDocument(
  caseId: number,
  docId: number,
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  const [doc] = await db
    .update(exitDocuments)
    .set({ status: "Sent", sentAt: new Date() })
    .where(and(eq(exitDocuments.id, docId), eq(exitDocuments.caseId, caseId)))
    .returning();
  if (!doc) throw new ApiError(404, "NOT_FOUND", "Document not found.");
  writeAuditLogAsync(
    {
      actorEmployeeId: actorEmpId,
      action: "OFFBOARDING_DOCUMENT_SENT",
      entityType: "offboarding_case",
      entityId: String(caseId),
      metadata: { docId, name: doc.name },
    },
    auditCtx,
  );
  return doc;
}

// ── Access revocation + final closure (Phase 6) ──

const ACCESS_SYSTEMS = [
  "HRMSLogin",
  "Email",
  "VPN",
  "CRM",
  "ERP",
  "AttendanceSystem",
  "BankingApplication",
] as const;

async function ensureAccessForCase(caseId: number): Promise<void> {
  const existing = await db
    .select({ id: accessRevocations.id })
    .from(accessRevocations)
    .where(eq(accessRevocations.caseId, caseId))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(accessRevocations).values(
    ACCESS_SYSTEMS.map((system) => ({
      caseId,
      system,
      status: "Active" as const,
      isAuto: system === "HRMSLogin",
    })),
  );
}

export async function getCaseAccess(caseId: number) {
  await getCase(caseId);
  await ensureAccessForCase(caseId);
  const rows = await db
    .select()
    .from(accessRevocations)
    .where(eq(accessRevocations.caseId, caseId))
    .orderBy(accessRevocations.id);
  return rows.map((r) => ({
    id: r.id,
    system: r.system,
    status: r.status,
    isAuto: r.isAuto,
    revokedAt: r.revokedAt,
  }));
}

async function applyRevocation(
  caseId: number,
  row: typeof accessRevocations.$inferSelect,
  actorEmpId: number | null,
) {
  await db
    .update(accessRevocations)
    .set({ status: "Disabled", revokedBy: actorEmpId, revokedAt: new Date() })
    .where(eq(accessRevocations.id, row.id));
  // HRMS login is the only real auto-action: disable the employee account.
  if (row.system === "HRMSLogin") {
    const [cse] = await db
      .select({ employeeId: offboardingCases.employeeId })
      .from(offboardingCases)
      .where(eq(offboardingCases.id, caseId))
      .limit(1);
    if (cse) {
      await db
        .update(employees)
        .set({ employeeStatus: "Exited" })
        .where(eq(employees.id, cse.employeeId));
    }
  }
}

export async function revokeAccess(
  caseId: number,
  accessId: number,
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  await ensureAccessForCase(caseId);
  const [row] = await db
    .select()
    .from(accessRevocations)
    .where(and(eq(accessRevocations.id, accessId), eq(accessRevocations.caseId, caseId)))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Access entry not found.");
  if (row.status === "Active") {
    await applyRevocation(caseId, row, actorEmpId);
    writeAuditLogAsync(
      {
        actorEmployeeId: actorEmpId,
        action: "OFFBOARDING_ACCESS_REVOKED",
        entityType: "offboarding_case",
        entityId: String(caseId),
        metadata: { system: row.system },
      },
      auditCtx,
    );
  }
  return getCaseAccess(caseId);
}

export async function revokeAllAccess(
  caseId: number,
  actorEmpId: number | null,
  auditCtx: AuditCtx,
) {
  await ensureAccessForCase(caseId);
  const rows = await db
    .select()
    .from(accessRevocations)
    .where(and(eq(accessRevocations.caseId, caseId), eq(accessRevocations.status, "Active")));
  for (const row of rows) {
    await applyRevocation(caseId, row, actorEmpId);
  }
  if (rows.length > 0) {
    writeAuditLogAsync(
      {
        actorEmployeeId: actorEmpId,
        action: "OFFBOARDING_ACCESS_REVOKED",
        entityType: "offboarding_case",
        entityId: String(caseId),
        metadata: { revoked: rows.map((r) => r.system) },
      },
      auditCtx,
    );
  }
  return getCaseAccess(caseId);
}

// Final-closure readiness across all sub-systems.
export async function getCaseClosure(caseId: number) {
  const cse = await getCase(caseId);
  await ensureAccessForCase(caseId);

  const clearance = await getCaseClearance(caseId);

  const [interview] = await db
    .select({ status: exitInterviewResponses.status })
    .from(exitInterviewResponses)
    .where(eq(exitInterviewResponses.caseId, caseId))
    .limit(1);

  const [settlement] = await db
    .select({ status: fnfSettlements.status })
    .from(fnfSettlements)
    .where(eq(fnfSettlements.caseId, caseId))
    .limit(1);

  const docs = await db
    .select({ status: exitDocuments.status })
    .from(exitDocuments)
    .where(eq(exitDocuments.caseId, caseId));
  const [tmplCount] = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(exitDocumentTemplates)
    .where(eq(exitDocumentTemplates.isActive, true));

  const access = await getCaseAccess(caseId);
  const accessRevoked = access.filter((a) => a.status === "Disabled").length;

  const clearancesComplete = clearance.summary.allComplete;
  const exitInterviewCompleted = interview?.status === "Completed";
  const fnfPaid = settlement?.status === "Paid";
  const accessAllRevoked = access.length > 0 && accessRevoked === access.length;

  const ready =
    clearancesComplete && exitInterviewCompleted && fnfPaid && accessAllRevoked && cse.status !== "Closed";

  return {
    caseId,
    status: cse.status,
    checklist: {
      clearances: {
        complete: clearancesComplete,
        teams: clearance.groups.map((g) => ({ team: g.team, status: g.status })),
      },
      exitInterview: { completed: exitInterviewCompleted, status: interview?.status ?? "NotAssigned" },
      fnf: { paid: fnfPaid, status: settlement?.status ?? "NotStarted" },
      documents: {
        total: Number(tmplCount?.n ?? 0),
        generated: docs.length,
        sent: docs.filter((d) => d.status === "Sent").length,
      },
      access: { allRevoked: accessAllRevoked, total: access.length, revoked: accessRevoked },
    },
    ready,
  };
}

export async function closeCase(caseId: number, actorEmpId: number | null, auditCtx: AuditCtx) {
  const closure = await getCaseClosure(caseId);
  if (closure.status === "Closed") {
    throw new ApiError(409, "ALREADY_CLOSED", "This case is already closed.");
  }
  if (!closure.ready) {
    throw new ApiError(409, "CLOSURE_NOT_READY", "All clearances, exit interview, FnF and access revocation must be complete before closing.");
  }
  await db.update(offboardingCases).set({ status: "Closed" }).where(eq(offboardingCases.id, caseId));
  writeAuditLogAsync(
    {
      actorEmployeeId: actorEmpId,
      action: "OFFBOARDING_CASE_CLOSED",
      entityType: "offboarding_case",
      entityId: String(caseId),
    },
    auditCtx,
  );
  return getCaseClosure(caseId);
}

// List all settlements with case + employee + computed net (for the FnF tab).
export async function listFnfSettlements() {
  const settlements = await db
    .select({ s: fnfSettlements, c: offboardingCases, e: EMP_FIELDS })
    .from(fnfSettlements)
    .innerJoin(offboardingCases, eq(offboardingCases.id, fnfSettlements.caseId))
    .innerJoin(employees, eq(employees.id, fnfSettlements.employeeId))
    .orderBy(desc(fnfSettlements.createdAt));
  if (settlements.length === 0) return [];
  const ids = settlements.map((r) => r.s.id);
  const lines = await db
    .select()
    .from(fnfLineItems)
    .where(inArray(fnfLineItems.settlementId, ids));
  const bySettlement = new Map<number, Array<{ kind: string; amount: string }>>();
  for (const l of lines) {
    const arr = bySettlement.get(l.settlementId) ?? [];
    arr.push({ kind: l.kind, amount: l.amount });
    bySettlement.set(l.settlementId, arr);
  }
  return settlements.map((r) => ({
    settlement: r.s,
    caseNumber: r.c.caseNumber,
    caseId: r.c.id,
    lastWorkingDate: r.c.lastWorkingDate,
    employee: r.e,
    totals: fnfTotals(bySettlement.get(r.s.id) ?? []),
  }));
}
