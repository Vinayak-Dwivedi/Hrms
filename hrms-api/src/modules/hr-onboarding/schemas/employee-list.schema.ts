import { z } from "zod";

export const employeeListQuerySchema = z.object({
  search: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  onboardingStatus: z
    .enum(["PENDING", "INVITATION_SENT", "IN_PROGRESS", "COMPLETED", "EXPIRED"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["createdAt", "joiningDate", "lastName"]).optional(),
});

export const employeeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
