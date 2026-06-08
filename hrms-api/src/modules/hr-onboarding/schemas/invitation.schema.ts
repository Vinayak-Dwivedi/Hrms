import { z } from "zod";

export const regenerateTokenSchema = z.object({
  resetPassword: z.boolean().optional().default(false),
  sendEmail: z.boolean().optional().default(false),
});
