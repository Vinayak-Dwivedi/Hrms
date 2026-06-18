import { type Request, type Response, type NextFunction, Router } from "express";
import { validateAndSavePrivateFile } from "@/infrastructure/storage/private-file-storage";
import { loadCurrentEmployee, loadCurrentManager } from "@/lib/employee";
import { ApiError } from "@/middleware/error";
import { getPermissionsForJwtRole, requirePermission } from "@/middleware/require-permission";
import { documentUpload } from "@/middleware/upload.middleware";
import { OFFBOARDING_PERMISSIONS } from "@/modules/offboarding/offboarding.permissions";
import {
  clearanceTaskUpdateSchema,
  buyoutDecisionSchema,
  clearanceTemplateCreateSchema,
  clearanceTemplatePatchSchema,
  decisionRemarksSchema,
  docTemplatePatchSchema,
  docTemplateUpsertSchema,
  exitInterviewSubmitSchema,
  exitReasonPatchSchema,
  exitReasonUpsertSchema,
  exitTemplatePatchSchema,
  exitTemplateUpsertSchema,
  fnfLineAddSchema,
  fnfLineUpdateSchema,
  fnfNotesSchema,
  flowPatchSchema,
  flowUpsertSchema,
  hrApproveSchema,
  managerApproveSchema,
  submitResignationSchema,
} from "@/modules/offboarding/offboarding.schema";
import * as svc from "@/modules/offboarding/offboarding.service";

export const offboardingRouter = Router();

// Admin config + HR endpoints accept the broad "admin.roles" code too, so the
// existing admin works without re-seeding granular permissions.
const adminAccess = requirePermission(OFFBOARDING_PERMISSIONS.MANAGE_FLOWS, "admin.roles");
const hrAccess = requirePermission(OFFBOARDING_PERMISSIONS.APPROVE_RESIGNATIONS, "admin.roles");
const casesAccess = requirePermission(
  OFFBOARDING_PERMISSIONS.MANAGE_CASES,
  OFFBOARDING_PERMISSIONS.APPROVE_RESIGNATIONS,
  "admin.roles",
);

function auditCtx(req: Request) {
  return { ipAddress: req.ip ?? null, userAgent: req.header("user-agent") ?? null };
}

function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "BAD_ID", "Numeric id required.");
  }
  return id;
}

// ───────────────────────── Employee ─────────────────────────

// Any authenticated user can read the active reason list for the form.
offboardingRouter.get("/exit-reasons/active", async (_req, res, next) => {
  try {
    res.json({ data: await svc.listActiveExitReasons() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post(
  "/resignations",
  documentUpload.single("attachment"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const emp = await loadCurrentEmployee(req.user!.id);
      const body = submitResignationSchema.parse(req.body ?? {});

      let attachmentPath: string | null = null;
      if (req.file) {
        const saved = await validateAndSavePrivateFile({
          employeeId: emp.id,
          originalName: req.file.originalname,
          buffer: req.file.buffer,
          declaredMime: req.file.mimetype,
        });
        attachmentPath = saved.storagePath;
      }

      const result = await svc.submitResignation(
        { id: emp.id, reportingManagerId: emp.reportingManagerId },
        body,
        attachmentPath,
        auditCtx(req),
      );
      res.status(201).json({ data: result });
    } catch (e) {
      next(e);
    }
  },
);

offboardingRouter.get("/resignations/mine", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    res.json({ data: await svc.getMyResignations(emp.id) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/resignations/:id/withdraw", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    res.json({ data: await svc.withdrawResignation(emp.id, idParam(req), auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Manager ─────────────────────────

offboardingRouter.get("/manager/resignations", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id);
    res.json({ data: await svc.listManagerResignations(mgr.id) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/manager/resignations/:id/approve", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id);
    const body = managerApproveSchema.parse(req.body ?? {});
    res.json({ data: await svc.managerApprove(mgr.id, idParam(req), body, auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/manager/resignations/:id/reject", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id);
    const body = decisionRemarksSchema.parse(req.body ?? {});
    res.json({
      data: await svc.managerReject(mgr.id, idParam(req), body.remarks ?? null, auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/manager/resignations/:id/discuss", async (req, res, next) => {
  try {
    const mgr = await loadCurrentManager(req.user!.id);
    const body = decisionRemarksSchema.parse(req.body ?? {});
    res.json({
      data: await svc.managerRequestDiscussion(mgr.id, idParam(req), body.remarks ?? null, auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── HR ─────────────────────────

offboardingRouter.get("/hr/resignations", hrAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listHrResignations() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/hr/resignations/:id/approve", hrAccess, async (req, res, next) => {
  try {
    const hr = await loadCurrentEmployee(req.user!.id);
    const body = hrApproveSchema.parse(req.body ?? {});
    res.json({ data: await svc.hrApprove(hr.id, idParam(req), body, auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/hr/resignations/:id/hold", hrAccess, async (req, res, next) => {
  try {
    const hr = await loadCurrentEmployee(req.user!.id);
    const body = decisionRemarksSchema.parse(req.body ?? {});
    res.json({ data: await svc.hrHold(hr.id, idParam(req), body.remarks ?? null, auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/hr/resignations/:id/resume", hrAccess, async (req, res, next) => {
  try {
    const hr = await loadCurrentEmployee(req.user!.id);
    res.json({ data: await svc.hrResume(hr.id, idParam(req), auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/hr/resignations/:id/reject", hrAccess, async (req, res, next) => {
  try {
    const hr = await loadCurrentEmployee(req.user!.id);
    const body = decisionRemarksSchema.parse(req.body ?? {});
    res.json({ data: await svc.hrReject(hr.id, idParam(req), body.remarks ?? null, auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/hr/resignations/:id/buyout", hrAccess, async (req, res, next) => {
  try {
    const hr = await loadCurrentEmployee(req.user!.id);
    const body = buyoutDecisionSchema.parse(req.body ?? {});
    res.json({
      data: await svc.hrBuyoutDecision(
        hr.id,
        idParam(req),
        body.decision,
        body.note ?? null,
        auditCtx(req),
      ),
    });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Admin: flows ─────────────────────────

offboardingRouter.get("/flows", adminAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listFlows() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.get("/flows/:id", adminAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getFlow(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/flows", adminAccess, async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id).catch(() => null);
    const body = flowUpsertSchema.parse(req.body ?? {});
    res.status(201).json({ data: await svc.createFlow(body, emp?.id ?? null) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/flows/:id", adminAccess, async (req, res, next) => {
  try {
    const body = flowPatchSchema.parse(req.body ?? {});
    res.json({ data: await svc.updateFlow(idParam(req), body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.delete("/flows/:id", adminAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.deleteFlow(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Admin: exit reasons ─────────────────────────

offboardingRouter.get("/exit-reasons", adminAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listExitReasons() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/exit-reasons", adminAccess, async (req, res, next) => {
  try {
    const body = exitReasonUpsertSchema.parse(req.body ?? {});
    res.status(201).json({ data: await svc.createExitReason(body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/exit-reasons/:id", adminAccess, async (req, res, next) => {
  try {
    const body = exitReasonPatchSchema.parse(req.body ?? {});
    res.json({ data: await svc.updateExitReason(idParam(req), body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.delete("/exit-reasons/:id", adminAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.deleteExitReason(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Offboarding cases ─────────────────────────

offboardingRouter.get("/cases", casesAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listCases() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.get("/cases/:id", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getCase(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Clearance (Phase 2) ─────────────────────────

// Admin-configurable per-team task templates.
offboardingRouter.get("/clearance-templates", adminAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listClearanceTemplates() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/clearance-templates", adminAccess, async (req, res, next) => {
  try {
    const body = clearanceTemplateCreateSchema.parse(req.body ?? {});
    res.status(201).json({ data: await svc.createClearanceTemplate(body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/clearance-templates/:id", adminAccess, async (req, res, next) => {
  try {
    const body = clearanceTemplatePatchSchema.parse(req.body ?? {});
    res.json({ data: await svc.updateClearanceTemplate(idParam(req), body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.delete("/clearance-templates/:id", adminAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.deleteClearanceTemplate(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

// Per-case clearance checklist.
offboardingRouter.get("/cases/:id/clearance", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getCaseClearance(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch(
  "/cases/:id/clearance/:taskId",
  casesAccess,
  async (req, res, next) => {
    try {
      const caseId = idParam(req);
      const taskId = Number(req.params.taskId);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        throw new ApiError(400, "BAD_ID", "Numeric task id required.");
      }
      const body = clearanceTaskUpdateSchema.parse(req.body ?? {});
      const actor = await loadCurrentEmployee(req.user!.id).catch(() => null);
      res.json({
        data: await svc.updateClearanceTask(caseId, taskId, body, actor?.id ?? null, auditCtx(req)),
      });
    } catch (e) {
      next(e);
    }
  },
);

// "My Clearances" — team-scoped view for managers / IT / Finance / etc.
// No permission gate at the route: the service filters to the teams the user
// can act on (per-team permission, or being the case's reporting manager).
offboardingRouter.get("/my-clearances", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const perms = new Set(await getPermissionsForJwtRole(req.user!.role));
    res.json({ data: await svc.getMyClearances(emp.id, perms) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/my-clearances/:caseId/:taskId", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const perms = new Set(await getPermissionsForJwtRole(req.user!.role));
    const caseId = Number(req.params.caseId);
    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(caseId) || caseId <= 0 || !Number.isInteger(taskId) || taskId <= 0) {
      throw new ApiError(400, "BAD_ID", "Numeric ids required.");
    }
    const body = clearanceTaskUpdateSchema.parse(req.body ?? {});
    res.json({
      data: await svc.updateMyClearanceTask(emp.id, perms, caseId, taskId, body, auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Exit interview (Phase 3) ─────────────────────────

// Admin: template builder CRUD.
offboardingRouter.get("/exit-interview-templates", adminAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listExitInterviewTemplates() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.get("/exit-interview-templates/:id", adminAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getExitInterviewTemplate(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/exit-interview-templates", adminAccess, async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id).catch(() => null);
    const body = exitTemplateUpsertSchema.parse(req.body ?? {});
    res.status(201).json({ data: await svc.createExitInterviewTemplate(body, emp?.id ?? null) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/exit-interview-templates/:id", adminAccess, async (req, res, next) => {
  try {
    const body = exitTemplatePatchSchema.parse(req.body ?? {});
    res.json({ data: await svc.updateExitInterviewTemplate(idParam(req), body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.delete("/exit-interview-templates/:id", adminAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.deleteExitInterviewTemplate(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

// Employee: my assigned exit interview + submit.
offboardingRouter.get("/me/exit-interview", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    res.json({ data: await svc.getMyExitInterview(emp.id) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/me/exit-interview/:id/submit", async (req, res, next) => {
  try {
    const emp = await loadCurrentEmployee(req.user!.id);
    const body = exitInterviewSubmitSchema.parse(req.body ?? {});
    res.json({
      data: await svc.submitMyExitInterview(emp.id, idParam(req), body.answers, auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

// HR / admin: view a case's exit-interview response.
offboardingRouter.get("/cases/:id/exit-interview", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getCaseExitInterview(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Full & Final (Phase 4) ─────────────────────────

async function actorId(req: Request): Promise<number | null> {
  const emp = await loadCurrentEmployee(req.user!.id).catch(() => null);
  return emp?.id ?? null;
}

function taskId(req: Request, key: string): number {
  const id = Number(req.params[key]);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "BAD_ID", "Numeric id required.");
  }
  return id;
}

offboardingRouter.get("/fnf", casesAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listFnfSettlements() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.get("/cases/:id/fnf", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getCaseFnf(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/cases/:id/fnf/lines", casesAccess, async (req, res, next) => {
  try {
    const body = fnfLineAddSchema.parse(req.body ?? {});
    res.status(201).json({ data: await svc.addFnfLine(idParam(req), body, await actorId(req), auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/cases/:id/fnf/lines/:lineId", casesAccess, async (req, res, next) => {
  try {
    const body = fnfLineUpdateSchema.parse(req.body ?? {});
    res.json({
      data: await svc.updateFnfLine(idParam(req), taskId(req, "lineId"), body, await actorId(req), auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.delete("/cases/:id/fnf/lines/:lineId", casesAccess, async (req, res, next) => {
  try {
    res.json({
      data: await svc.deleteFnfLine(idParam(req), taskId(req, "lineId"), await actorId(req), auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/cases/:id/fnf", casesAccess, async (req, res, next) => {
  try {
    const body = fnfNotesSchema.parse(req.body ?? {});
    res.json({ data: await svc.updateFnfNotes(idParam(req), body.notes ?? null) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/cases/:id/fnf/approve", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.approveFnf(idParam(req), await actorId(req), auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/cases/:id/fnf/pay", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.payFnf(idParam(req), await actorId(req), auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

// ───────────────────────── Exit documents (Phase 5) ─────────────────────────

// Admin: document template CRUD.
offboardingRouter.get("/document-templates", adminAccess, async (_req, res, next) => {
  try {
    res.json({ data: await svc.listDocumentTemplates() });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/document-templates", adminAccess, async (req, res, next) => {
  try {
    const body = docTemplateUpsertSchema.parse(req.body ?? {});
    res.status(201).json({ data: await svc.createDocumentTemplate(body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.patch("/document-templates/:id", adminAccess, async (req, res, next) => {
  try {
    const body = docTemplatePatchSchema.parse(req.body ?? {});
    res.json({ data: await svc.updateDocumentTemplate(idParam(req), body) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.delete("/document-templates/:id", adminAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.deleteDocumentTemplate(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

// Per-case documents.
offboardingRouter.get("/cases/:id/documents", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getCaseDocuments(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post(
  "/cases/:id/documents/:templateId/generate",
  casesAccess,
  async (req, res, next) => {
    try {
      res.status(201).json({
        data: await svc.generateDocument(idParam(req), taskId(req, "templateId"), await actorId(req), auditCtx(req)),
      });
    } catch (e) {
      next(e);
    }
  },
);

offboardingRouter.get("/cases/:id/documents/:docId", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getDocument(idParam(req), taskId(req, "docId")) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/cases/:id/documents/:docId/send", casesAccess, async (req, res, next) => {
  try {
    res.json({
      data: await svc.sendDocument(idParam(req), taskId(req, "docId"), await actorId(req), auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

// ─────────────── Access revocation + final closure (Phase 6) ───────────────

offboardingRouter.get("/cases/:id/access", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getCaseAccess(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/cases/:id/access/:accessId/revoke", casesAccess, async (req, res, next) => {
  try {
    res.json({
      data: await svc.revokeAccess(idParam(req), taskId(req, "accessId"), await actorId(req), auditCtx(req)),
    });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/cases/:id/access/revoke-all", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.revokeAllAccess(idParam(req), await actorId(req), auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.get("/cases/:id/closure", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.getCaseClosure(idParam(req)) });
  } catch (e) {
    next(e);
  }
});

offboardingRouter.post("/cases/:id/close", casesAccess, async (req, res, next) => {
  try {
    res.json({ data: await svc.closeCase(idParam(req), await actorId(req), auditCtx(req)) });
  } catch (e) {
    next(e);
  }
});
