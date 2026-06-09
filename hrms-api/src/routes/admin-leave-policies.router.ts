// Admin CRUD for leave policies + their nested approval workflows.
// Mounted at /api/admin/leave-policies.
//
// One policy ↔ one leave_type. A policy bundles:
//   - settings (JSONB — toggles/numbers; shape depends on leave_type)
//   - scope rows (Company / Branch / Department / … — which employees it covers)
//   - approval workflows (criteria → outcome → email template)
//
// POST/PATCH happen in a single transaction so settings + scope + workflows
// either all save or none do.

import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/runtime";
import {
  leavePolicies,
  leavePolicyScope,
  leaveApprovalWorkflows,
  leaveTypes,
} from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const adminLeavePoliciesRouter: Router = Router();

const SCOPE_TYPES = [
  "Company",
  "Branch",
  "Department",
  "Designation",
  "Grade",
  "EmploymentType",
  "Process",
  "Employee",
] as const;
type ScopeType = (typeof SCOPE_TYPES)[number];

// ───── Zod schemas ────────────────────────────────────────────────────────

const recipientSchema = z.object({
  category: z.string(),
  id: z.string(),
  label: z.string(),
});

const criterionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});

const scopeRowSchema = z
  .object({
    scopeType: z.enum(SCOPE_TYPES),
    scopeId: z.number().int().positive().nullable().optional(),
    priority: z.number().int().min(0).default(100),
  })
  .refine(
    (s) =>
      (s.scopeType === "Company" && (s.scopeId == null)) ||
      (s.scopeType !== "Company" && s.scopeId != null),
    "scope_id is required for non-Company scope, must be null for Company.",
  );

const workflowSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().optional().nullable(),
  criteria: z.array(criterionSchema).default([]),
  outcome: z.enum(["AutoApprove", "AutoReject", "Route"]),
  fromMode: z.string().default("Person performing this action"),
  toRecipients: z.array(recipientSchema).default([]),
  ccRecipients: z.array(recipientSchema).default([]),
  bccRecipients: z.array(recipientSchema).default([]),
  replyToRecipients: z.array(recipientSchema).default([]),
  subject: z.string().default(""),
  body: z.string().default(""),
  isActive: z.boolean().default(true),
});

const policyUpsertSchema = z.object({
  leaveTypeId: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  description: z.string().optional().nullable(),
  status: z.enum(["Draft", "Active", "Archived"]).default("Active"),
  isDefault: z.boolean().default(false),
  settings: z.record(z.string(), z.unknown()).default({}),
  scope: z.array(scopeRowSchema).default([]),
  approvals: z.array(workflowSchema).default([]),
});

// PATCH schema must NOT apply .default([]) to scope/approvals — that would
// quietly wipe them whenever the caller omits those fields. Each field
// remains optional and undefined-when-missing.
const policyPatchSchema = z.object({
  leaveTypeId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["Draft", "Active", "Archived"]).optional(),
  isDefault: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  scope: z.array(scopeRowSchema).optional(),
  approvals: z.array(workflowSchema).optional(),
});

// ───── shape helpers ──────────────────────────────────────────────────────

async function loadFullPolicy(policyId: number) {
  const [policy] = await db
    .select()
    .from(leavePolicies)
    .where(eq(leavePolicies.id, policyId))
    .limit(1);
  if (!policy) return null;
  const scope = await db
    .select()
    .from(leavePolicyScope)
    .where(eq(leavePolicyScope.policyId, policyId))
    .orderBy(asc(leavePolicyScope.priority));
  const approvals = await db
    .select()
    .from(leaveApprovalWorkflows)
    .where(eq(leaveApprovalWorkflows.policyId, policyId))
    .orderBy(asc(leaveApprovalWorkflows.id));
  return {
    id: policy.id,
    leaveTypeId: policy.leaveTypeId,
    name: policy.name,
    description: policy.description,
    status: policy.status,
    isDefault: policy.isDefault,
    settings: policy.settings,
    createdBy: policy.createdBy,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
    scope: scope.map((s) => ({
      id: s.id,
      scopeType: s.scopeType as ScopeType,
      scopeId: s.scopeId,
      priority: s.priority,
    })),
    approvals: approvals.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      criteria: a.criteria,
      outcome: a.outcome,
      fromMode: a.fromMode,
      toRecipients: a.toRecipients,
      ccRecipients: a.ccRecipients,
      bccRecipients: a.bccRecipients,
      replyToRecipients: a.replyToRecipients,
      subject: a.subject,
      body: a.body,
      isActive: a.isActive,
    })),
  };
}

// ───── routes ─────────────────────────────────────────────────────────────

// GET /api/admin/leave-policies?leaveTypeId=4&leaveTypeCode=CO
//   List policies. Optional filter by leave_type id or code.
adminLeavePoliciesRouter.get("/", async (req, res, next) => {
  try {
    const leaveTypeId = req.query.leaveTypeId
      ? Number(req.query.leaveTypeId)
      : null;
    const leaveTypeCode = typeof req.query.leaveTypeCode === "string"
      ? req.query.leaveTypeCode
      : null;

    let resolvedTypeId = leaveTypeId;
    if (!resolvedTypeId && leaveTypeCode) {
      const [lt] = await db
        .select({ id: leaveTypes.id })
        .from(leaveTypes)
        .where(eq(leaveTypes.code, leaveTypeCode))
        .limit(1);
      resolvedTypeId = lt?.id ?? null;
    }

    const rows = await db
      .select()
      .from(leavePolicies)
      .where(
        resolvedTypeId
          ? eq(leavePolicies.leaveTypeId, resolvedTypeId)
          : undefined,
      )
      .orderBy(desc(leavePolicies.updatedAt));

    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/leave-policies/:id  →  full bundle with scope + approvals.
adminLeavePoliciesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const full = await loadFullPolicy(id);
    if (!full) {
      throw new ApiError(404, "NOT_FOUND", "Policy not found.");
    }
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/leave-policies  →  create policy + scope + approvals in one tx.
adminLeavePoliciesRouter.post("/", async (req, res, next) => {
  try {
    const body = policyUpsertSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // If isDefault=true, unset any other default for this leave_type.
      if (body.isDefault) {
        await tx
          .update(leavePolicies)
          .set({ isDefault: false })
          .where(
            and(
              eq(leavePolicies.leaveTypeId, body.leaveTypeId),
              eq(leavePolicies.isDefault, true),
            ),
          );
      }
      const [inserted] = await tx
        .insert(leavePolicies)
        .values({
          leaveTypeId: body.leaveTypeId,
          name: body.name,
          description: body.description ?? null,
          status: body.status,
          isDefault: body.isDefault,
          settings: body.settings,
          createdBy: null,
        })
        .returning();
      const policyId = inserted!.id;

      if (body.scope.length > 0) {
        await tx.insert(leavePolicyScope).values(
          body.scope.map((s) => ({
            policyId,
            scopeType: s.scopeType,
            scopeId: s.scopeId ?? null,
            priority: s.priority,
          })),
        );
      }
      if (body.approvals.length > 0) {
        await tx.insert(leaveApprovalWorkflows).values(
          body.approvals.map((a) => ({
            policyId,
            name: a.name,
            description: a.description ?? null,
            criteria: a.criteria,
            outcome: a.outcome,
            fromMode: a.fromMode,
            toRecipients: a.toRecipients,
            ccRecipients: a.ccRecipients,
            bccRecipients: a.bccRecipients,
            replyToRecipients: a.replyToRecipients,
            subject: a.subject,
            body: a.body,
            isActive: a.isActive,
          })),
        );
      }
      return policyId;
    });

    const full = await loadFullPolicy(result);
    res.status(201).json({ data: full });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/admin/leave-policies/:id  →  replaces scope + approvals
//   completely with whatever is in the body (simpler than diff-and-patch).
adminLeavePoliciesRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const body = policyPatchSchema.parse(req.body);

    await db.transaction(async (tx) => {
      // Update header
      const headerPatch: Record<string, unknown> = {};
      if (body.name !== undefined) headerPatch.name = body.name;
      if (body.description !== undefined)
        headerPatch.description = body.description ?? null;
      if (body.status !== undefined) headerPatch.status = body.status;
      if (body.isDefault !== undefined) headerPatch.isDefault = body.isDefault;
      if (body.settings !== undefined) headerPatch.settings = body.settings;
      if (body.leaveTypeId !== undefined)
        headerPatch.leaveTypeId = body.leaveTypeId;

      if (body.isDefault === true && body.leaveTypeId !== undefined) {
        await tx
          .update(leavePolicies)
          .set({ isDefault: false })
          .where(
            and(
              eq(leavePolicies.leaveTypeId, body.leaveTypeId),
              eq(leavePolicies.isDefault, true),
            ),
          );
      }

      if (Object.keys(headerPatch).length > 0) {
        const [updated] = await tx
          .update(leavePolicies)
          .set(headerPatch)
          .where(eq(leavePolicies.id, id))
          .returning();
        if (!updated) {
          throw new ApiError(404, "NOT_FOUND", "Policy not found.");
        }
      }

      // Replace scope if provided
      if (body.scope !== undefined) {
        await tx
          .delete(leavePolicyScope)
          .where(eq(leavePolicyScope.policyId, id));
        if (body.scope.length > 0) {
          await tx.insert(leavePolicyScope).values(
            body.scope.map((s) => ({
              policyId: id,
              scopeType: s.scopeType,
              scopeId: s.scopeId ?? null,
              priority: s.priority,
            })),
          );
        }
      }

      // Replace approvals if provided
      if (body.approvals !== undefined) {
        await tx
          .delete(leaveApprovalWorkflows)
          .where(eq(leaveApprovalWorkflows.policyId, id));
        if (body.approvals.length > 0) {
          await tx.insert(leaveApprovalWorkflows).values(
            body.approvals.map((a) => ({
              policyId: id,
              name: a.name,
              description: a.description ?? null,
              criteria: a.criteria,
              outcome: a.outcome,
              fromMode: a.fromMode,
              toRecipients: a.toRecipients,
              ccRecipients: a.ccRecipients,
              bccRecipients: a.bccRecipients,
              replyToRecipients: a.replyToRecipients,
              subject: a.subject,
              body: a.body,
              isActive: a.isActive,
            })),
          );
        }
      }
    });

    const full = await loadFullPolicy(id);
    res.json({ data: full });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/admin/leave-policies/:id  →  archive (soft-delete).
adminLeavePoliciesRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new ApiError(400, "BAD_ID", "Numeric id required.");
    }
    const [updated] = await db
      .update(leavePolicies)
      .set({ status: "Archived", isDefault: false })
      .where(eq(leavePolicies.id, id))
      .returning();
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "Policy not found.");
    }
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});
