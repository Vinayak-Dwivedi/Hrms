// Approval Workflows — definition (admin CRUD) + the simple multi-stage runtime
// that walks a leave request through ordered approver stages.
//
//   Admin CRUD          → /api/admin/approval-workflows
//   Runtime approvals   → /api/workflow-approvals  (GET pending, approve, reject)
//
// Stage values: 'Manager' (reporting manager) | 'DeptHead' (employee's
// department manager) | 'HR' (admin/HR role).

import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  approvalWorkflows,
  orgHierarchyDepartments as departments,
  employees,
  leavePlanScope,
  leavePlans,
  leaveRequests,
  leaveTypes,
} from "@/db/schema/hrms";
import { loadCurrentEmployee } from "@/lib/employee";
import { ApiError } from "@/middleware/error";

const STAGES = ["Manager", "DeptHead", "HR"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABEL: Record<Stage, string> = {
  Manager: "Manager",
  DeptHead: "Department Head",
  HR: "HR",
};

// ───────────────────────────────────────────────────────────────────────────
// Admin CRUD
// ───────────────────────────────────────────────────────────────────────────

export const adminApprovalWorkflowsRouter: Router = Router();

const upsertSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional().nullable(),
  stages: z.array(z.enum(STAGES)).min(1).max(6),
  isActive: z.boolean().default(true),
});

adminApprovalWorkflowsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(approvalWorkflows)
      .orderBy(approvalWorkflows.id);
    res.json({
      data: rows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        stages: w.stages as Stage[],
        isActive: w.isActive,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminApprovalWorkflowsRouter.post("/", async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const [row] = await db
      .insert(approvalWorkflows)
      .values({
        name: body.name,
        description: body.description ?? null,
        stages: body.stages,
        isActive: body.isActive,
      })
      .returning();
    res.status(201).json({ data: row });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (/approval_workflows_name/i.test(msg)) {
      next(new ApiError(409, "DUPLICATE", "A workflow with this name exists."));
      return;
    }
    next(e);
  }
});

adminApprovalWorkflowsRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    const body = upsertSchema.partial().parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.stages !== undefined) updates.stages = body.stages;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    const [row] = await db
      .update(approvalWorkflows)
      .set(updates)
      .where(eq(approvalWorkflows.id, id))
      .returning();
    if (!row) throw new ApiError(404, "NOT_FOUND", "Workflow not found.");
    res.json({ data: row });
  } catch (e) {
    next(e);
  }
});

adminApprovalWorkflowsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    await db.delete(approvalWorkflows).where(eq(approvalWorkflows.id, id));
    res.json({ data: { id, deleted: true } });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// Runtime resolver — which workflow stages apply to an employee's request?
// ───────────────────────────────────────────────────────────────────────────

const SPECIFICITY: Record<string, number> = {
  Employee: 8,
  Designation: 7,
  Grade: 6,
  SubDepartment: 5,
  Department: 4,
  Branch: 3,
  Location: 2,
  EmploymentType: 1,
  Company: 0,
};

/** Resolve the ordered approver stages for a new leave request, from the
 *  best-matching Active leave plan's assigned workflow. Falls back to a single
 *  Manager stage when no plan/workflow applies. */
export async function resolveWorkflowStages(employeeId: number): Promise<Stage[]> {
  const [emp] = await db
    .select({
      id: employees.id,
      branchId: employees.branchId,
      departmentId: employees.departmentId,
      subDepartmentId: employees.subDepartmentId,
      designationId: employees.designationId,
      gradeId: employees.gradeId,
      employmentTypeId: employees.employmentTypeId,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp) return ["Manager"];

  const facet: Record<string, number | null> = {
    Employee: emp.id,
    Designation: emp.designationId,
    Grade: emp.gradeId,
    SubDepartment: emp.subDepartmentId,
    Department: emp.departmentId,
    Branch: emp.branchId,
    EmploymentType: emp.employmentTypeId,
  };

  const rows = await db
    .select({
      workflowId: leavePlans.approvalWorkflowId,
      scopeType: leavePlanScope.scopeType,
      scopeId: leavePlanScope.scopeId,
      priority: leavePlanScope.priority,
    })
    .from(leavePlans)
    .innerJoin(leavePlanScope, eq(leavePlanScope.planId, leavePlans.id))
    .where(eq(leavePlans.status, "Active"));

  let best: { workflowId: number; spec: number; priority: number } | null = null;
  for (const r of rows) {
    if (r.workflowId == null) continue;
    const matches =
      r.scopeType === "Company" ||
      (facet[r.scopeType] != null && facet[r.scopeType] === r.scopeId);
    if (!matches) continue;
    const spec = SPECIFICITY[r.scopeType] ?? 0;
    if (!best || spec > best.spec || (spec === best.spec && r.priority > best.priority)) {
      best = { workflowId: r.workflowId, spec, priority: r.priority };
    }
  }
  if (!best) return ["Manager"];

  const [wf] = await db
    .select({ stages: approvalWorkflows.stages, isActive: approvalWorkflows.isActive })
    .from(approvalWorkflows)
    .where(eq(approvalWorkflows.id, best.workflowId))
    .limit(1);
  const stages = (wf?.stages as Stage[] | undefined) ?? [];
  return wf?.isActive && stages.length > 0 ? stages : ["Manager"];
}

// ───────────────────────────────────────────────────────────────────────────
// Runtime approvals
// ───────────────────────────────────────────────────────────────────────────

export const workflowApprovalsRouter: Router = Router();

function stagesOf(r: { workflowStages: unknown }): Stage[] {
  const s = (r.workflowStages as Stage[] | null) ?? null;
  return s && s.length > 0 ? s : ["Manager"];
}

function currentStageRole(r: { workflowStages: unknown; currentStage: number }): Stage {
  const s = stagesOf(r);
  return s[Math.min(r.currentStage, s.length - 1)] ?? "Manager";
}

async function approverContext(reqUser: { id: string; role: string }) {
  const me = await loadCurrentEmployee(reqUser.id);
  const isAdmin = reqUser.role === "admin";
  const myDepts = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.managerId, me.id));
  return { meId: me.id, isAdmin, deptIds: new Set(myDepts.map((d) => d.id)) };
}

function canAct(
  stage: Stage,
  row: { managerId: number | null; employeeDeptId: number | null },
  ctx: { meId: number; isAdmin: boolean; deptIds: Set<number> },
): boolean {
  if (stage === "Manager") return row.managerId === ctx.meId;
  if (stage === "DeptHead") return row.employeeDeptId != null && ctx.deptIds.has(row.employeeDeptId);
  if (stage === "HR") return ctx.isAdmin;
  return false;
}

workflowApprovalsRouter.get("/", async (req, res, next) => {
  try {
    const ctx = await approverContext(req.user!);
    const rows = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        employeeDeptId: employees.departmentId,
        managerId: leaveRequests.managerId,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
        code: leaveTypes.code,
        typeName: leaveTypes.name,
        status: leaveRequests.status,
        workflowStages: leaveRequests.workflowStages,
        currentStage: leaveRequests.currentStage,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.status, "Pending"))
      .orderBy(desc(leaveRequests.createdAt));

    const data = rows
      .map((r) => {
        const stages = stagesOf(r);
        const stage = currentStageRole(r);
        return {
          id: r.id,
          employeeName: `${r.firstName} ${r.lastName}`,
          fromDate: r.fromDate,
          toDate: r.toDate,
          days: Number(r.days),
          reason: r.reason,
          leaveCode: r.code,
          leaveType: r.typeName,
          stage,
          stageLabel: STAGE_LABEL[stage],
          stageIndex: r.currentStage,
          totalStages: stages.length,
          stagePath: stages.map((s) => STAGE_LABEL[s]),
          _canAct: canAct(stage, { managerId: r.managerId, employeeDeptId: r.employeeDeptId }, ctx),
        };
      })
      .filter((r) => r._canAct)
      .map(({ _canAct, ...rest }) => {
        void _canAct;
        return rest;
      });

    res.json({ data });
  } catch (e) {
    next(e);
  }
});

async function loadActionable(reqUser: { id: string; role: string }, id: number) {
  const ctx = await approverContext(reqUser);
  const [row] = await db
    .select({
      r: leaveRequests,
      employeeDeptId: employees.departmentId,
    })
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .where(eq(leaveRequests.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Leave request not found.");
  if (row.r.status !== "Pending") {
    throw new ApiError(409, "ALREADY_DECIDED", `Request already ${row.r.status}.`);
  }
  const stage = currentStageRole(row.r);
  if (!canAct(stage, { managerId: row.r.managerId, employeeDeptId: row.employeeDeptId }, ctx)) {
    throw new ApiError(403, "NOT_APPROVER", "You are not the current approver for this request.");
  }
  return { row: row.r, ctx, stage };
}

workflowApprovalsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    const { row } = await loadActionable(req.user!, id);
    const stages = stagesOf(row);
    const isFinal = row.currentStage >= stages.length - 1;

    if (isFinal) {
      await db
        .update(leaveRequests)
        .set({ status: "Approved" })
        .where(eq(leaveRequests.id, id));
      res.json({ data: { id, status: "Approved", final: true } });
    } else {
      const nextStage = row.currentStage + 1;
      await db
        .update(leaveRequests)
        .set({ currentStage: nextStage })
        .where(eq(leaveRequests.id, id));
      res.json({
        data: {
          id,
          status: "Pending",
          final: false,
          nextStage: STAGE_LABEL[stages[nextStage] ?? "Manager"],
        },
      });
    }
  } catch (e) {
    next(e);
  }
});

workflowApprovalsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new ApiError(400, "BAD_ID", "Numeric id required.");
    const remarks = typeof req.body?.remarks === "string" ? req.body.remarks : null;
    const { row } = await loadActionable(req.user!, id);
    await db
      .update(leaveRequests)
      .set({ status: "Rejected", managerRemarks: remarks })
      .where(eq(leaveRequests.id, row.id));
    res.json({ data: { id, status: "Rejected" } });
  } catch (e) {
    next(e);
  }
});
