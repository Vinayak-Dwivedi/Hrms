import { z } from "zod";

export const auditLogQuerySchema = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
