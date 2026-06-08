import { z } from "zod";

export const rejectDocumentSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const approveOnboardingSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});
