import type { NextFunction, Request, Response } from "express";
import { loadCurrentEmployee } from "@/lib/employee";
import * as documentService from "@/modules/onboarding/services/document.service";
import { upsertProfileSchema } from "@/modules/onboarding/schemas/profile.schema";
import {
  documentIdParamSchema,
  documentTypeSchema,
} from "@/modules/onboarding/schemas/document.schema";
import { employeeIdParamSchema } from "@/modules/hr-onboarding/schemas/employee-list.schema";
import * as onBehalfService from "@/modules/hr-onboarding/services/employee-on-behalf.service";
import { ApiError } from "@/middleware/error";

export async function getOnboardingProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const profile = await onBehalfService.getProfileOnBehalf(id);
    res.json(profile);
  } catch (e) {
    next(e);
  }
}

export async function putOnboardingProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const body = upsertProfileSchema.parse(req.body);
    const profile = await onBehalfService.updateProfileOnBehalf({
      employeeId: id,
      input: body,
      actorUserId: req.user!.id,
      audit: req.auditContext,
    });
    res.json(profile);
  } catch (e) {
    next(e);
  }
}

export async function uploadOnboardingDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) {
      throw new ApiError(400, "NO_FILE", "No file uploaded.");
    }
    const { id } = employeeIdParamSchema.parse(req.params);
    await onBehalfService.ensureEditableOnBehalf(id, "documents");
    const documentType = documentTypeSchema.parse(req.body.documentType);
    let reviewerEmployeeId: number | undefined;
    try {
      reviewerEmployeeId = (await loadCurrentEmployee(req.user!.id)).id;
    } catch {
      reviewerEmployeeId = undefined;
    }
    const row = await documentService.uploadDocument({
      employeeId: id,
      documentType,
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      declaredMime: req.file.mimetype,
      actorUserId: req.user?.id,
      autoVerify:
        reviewerEmployeeId != null ? { reviewerEmployeeId } : undefined,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function deleteOnboardingDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const { id: documentId } = documentIdParamSchema.parse({
      id: req.params.documentId,
    });
    await onBehalfService.ensureEditableOnBehalf(id, "documents");
    const result = await documentService.deleteDocument({
      employeeId: id,
      documentId,
      isAdmin: true,
      onboardingCompleted: false,
      actorUserId: req.user?.id,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function submitOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const result = await onBehalfService.submitOnboardingOnBehalf({
      employeeId: id,
      actorUserId: req.user!.id,
      audit: req.auditContext,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
