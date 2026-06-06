import { z } from "zod";

export const submitOnboardingResponseSchema = z.object({
  onboardingStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "COMPLETED"]),
  completedAt: z.string(),
});

export type SubmitOnboardingResponse = z.infer<
  typeof submitOnboardingResponseSchema
>;
