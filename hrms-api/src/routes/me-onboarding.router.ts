import { Router } from "express";
import { z } from "zod";
import * as profileService from "@/modules/onboarding/services/employee-profile.service";
import * as submitService from "@/modules/onboarding/services/onboarding-submit.service";
import { listRequiredSubmitDocumentTypes } from "@/modules/onboarding/required-documents";
import * as documentsController from "@/modules/onboarding/controllers/documents.controller";
import { requireEmployee } from "@/middleware/require-employee";
import { documentUpload } from "@/middleware/upload.middleware";
import { upsertProfileSchema } from "@/modules/onboarding/schemas/profile.schema";

export const meOnboardingRouter = Router();

meOnboardingRouter.use(requireEmployee);

function setDeprecated(res: import("express").Response) {
  res.setHeader("Deprecation", "true");
  res.setHeader(
    "Link",
    '</api/employee/profile>; rel="successor-version"',
  );
}

const legacyProfileSchema = z.object({
  currentAddress: z.string().trim().min(1).max(200),
  permanentAddress: z.string().trim().min(1).max(200),
  emergencyContactName: z.string().trim().min(1).max(200),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/),
  fatherName: z.string().trim().max(200).optional().nullable(),
  motherName: z.string().trim().max(200).optional().nullable(),
  bloodGroup: z.string().trim().max(5).optional().nullable(),
  nationality: z.string().trim().max(50).optional(),
  panNo: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/),
  aadhaarNo: z.string().trim().regex(/^[0-9]{12}$/),
  uanNo: z.string().trim().max(20).optional().nullable(),
  esicNo: z.string().trim().max(20).optional().nullable(),
});

meOnboardingRouter.get("/status", async (req, res, next) => {
  try {
    setDeprecated(res);
    const profile = await profileService.getProfile(req.employee!.id);
    const requiredDocuments = listRequiredSubmitDocumentTypes(profile.academic);
    const pendingDocuments = requiredDocuments.filter(
      (type) =>
        !profile.documents.some(
          (d) => d.documentType === type && d.status !== "Rejected",
        ),
    );
    res.json({
      completed: profile.onboardingStatus === "COMPLETED",
      completedAt: profile.completedAt,
      profileComplete:
        !!profile.personal.currentAddress &&
        !!profile.personal.permanentAddress &&
        !!profile.identity.panNumber &&
        !!profile.identity.aadhaarNumber,
      pendingDocuments,
      documents: profile.documents,
      onboardingStatus: profile.onboardingStatus,
    });
  } catch (e) {
    next(e);
  }
});

meOnboardingRouter.patch("/profile", async (req, res, next) => {
  try {
    setDeprecated(res);
    const body = legacyProfileSchema.parse(req.body);
    const existing = await profileService.getProfile(req.employee!.id);
    const payload = upsertProfileSchema.parse({
      personal: {
        currentAddress: body.currentAddress,
        permanentAddress: body.permanentAddress,
        emergencyContactName: body.emergencyContactName,
        emergencyContactPhone: body.emergencyContactPhone,
        fatherName: body.fatherName,
        motherName: body.motherName,
        bloodGroup: body.bloodGroup,
        nationality: body.nationality,
      },
      identity: {
        panNumber: body.panNo,
        aadhaarNumber: body.aadhaarNo,
        uanNumber: body.uanNo,
        esicNumber: body.esicNo,
      },
      academic: existing.academic,
      professional: existing.professional,
      bank: existing.bank,
    });
    const profile = await profileService.upsertProfile(req.employee!.id, payload);
    res.json({
      profileComplete:
        !!profile.personal.currentAddress &&
        !!profile.identity.panNumber &&
        !!profile.identity.aadhaarNumber,
    });
  } catch (e) {
    next(e);
  }
});

meOnboardingRouter.get("/documents", async (req, res, next) => {
  try {
    setDeprecated(res);
    const profile = await profileService.getProfile(req.employee!.id);
    res.json({ documents: profile.documents });
  } catch (e) {
    next(e);
  }
});

meOnboardingRouter.post(
  "/documents",
  (req, res, next) => {
    setDeprecated(res);
    next();
  },
  documentUpload.single("file"),
  documentsController.uploadDocument,
);

meOnboardingRouter.post("/complete", async (req, res, next) => {
  try {
    setDeprecated(res);
    const result = await submitService.submitOnboarding(req.employee!.id);
    res.json({
      submitted: result.submitted,
      submittedAt: result.submittedAt,
      onboardingStatus: result.onboardingStatus,
    });
  } catch (e) {
    next(e);
  }
});
