import { Router } from "express";
import * as employeeAdminCtrl from "@/modules/hr-onboarding/controllers/employee-admin.controller";
import * as docVerificationCtrl from "@/modules/hr-onboarding/controllers/document-verification.controller";
import * as invitationCtrl from "@/modules/hr-onboarding/controllers/invitation.controller";
import * as reportingCtrl from "@/modules/hr-onboarding/controllers/reporting.controller";
import * as formOptionsController from "@/modules/onboarding/controllers/form-options.controller";
import { requirePermission } from "@/middleware/require-permission";

export const hrOnboardingRoutes = Router();

const view = requirePermission("onboarding.view", "employees.view");
const manage = requirePermission("onboarding.manage");
const verify = requirePermission("onboarding.verify_documents");
const resend = requirePermission("onboarding.resend_invitation");

hrOnboardingRoutes.get("/form-options", view, formOptionsController.getFormOptions);

hrOnboardingRoutes.get(
  "/employees/pending-review",
  view,
  employeeAdminCtrl.listPendingReview,
);
hrOnboardingRoutes.post(
  "/employees/:id/approve",
  manage,
  employeeAdminCtrl.approveOnboarding,
);

hrOnboardingRoutes.post(
  "/documents/:id/verify",
  verify,
  docVerificationCtrl.verifyDocument,
);
hrOnboardingRoutes.post(
  "/documents/:id/reject",
  verify,
  docVerificationCtrl.rejectDocument,
);
hrOnboardingRoutes.get(
  "/documents/:id/download",
  verify,
  docVerificationCtrl.downloadDocument,
);

hrOnboardingRoutes.post(
  "/employees/:id/regenerate-token",
  resend,
  invitationCtrl.regenerateToken,
);
hrOnboardingRoutes.post(
  "/employees/:id/invalidate-token",
  manage,
  invitationCtrl.invalidateToken,
);

hrOnboardingRoutes.get(
  "/reports/completion-stats",
  view,
  reportingCtrl.completionStats,
);
hrOnboardingRoutes.get("/reports/pending", view, reportingCtrl.pendingReport);
hrOnboardingRoutes.get(
  "/reports/expired-invitations",
  view,
  reportingCtrl.expiredInvitations,
);

hrOnboardingRoutes.get("/audit-logs", manage, reportingCtrl.auditLogs);
