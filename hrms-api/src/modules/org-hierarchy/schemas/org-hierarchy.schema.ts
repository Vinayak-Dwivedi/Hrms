import { z } from "zod";
import { ORG_HIERARCHY_STATUS } from "@/modules/org-hierarchy/constants";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  status: z.enum(ORG_HIERARCHY_STATUS).optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  levelId: z.coerce.number().int().positive().optional(),
  companyId: z.coerce.number().int().positive().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(20),
  status: z.enum(ORG_HIERARCHY_STATUS).optional(),
  companyId: z.number().int().positive().nullable().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createSubDepartmentSchema = z.object({
  departmentId: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  status: z.enum(ORG_HIERARCHY_STATUS).optional(),
  companyId: z.number().int().positive().nullable().optional(),
});

export const updateSubDepartmentSchema = z.object({
  departmentId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  status: z.enum(ORG_HIERARCHY_STATUS).optional(),
  companyId: z.number().int().positive().nullable().optional(),
});

export const createLevelSchema = z.object({
  code: z.string().trim().min(1).max(10),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateLevelSchema = createLevelSchema.partial();

export const createDesignationSchema = z.object({
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().min(1).max(20).optional(),
  levelId: z.number().int().positive(),
  status: z.enum(ORG_HIERARCHY_STATUS).optional(),
});

export const updateDesignationSchema = createDesignationSchema.partial();

export const createStructureSchema = z.object({
  departmentId: z.number().int().positive(),
  subDepartmentId: z.number().int().positive(),
  designationId: z.number().int().positive(),
  companyId: z.number().int().positive().nullable().optional(),
});

export const updateStructureSchema = createStructureSchema.partial();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateSubDepartmentInput = z.infer<typeof createSubDepartmentSchema>;
export type UpdateSubDepartmentInput = z.infer<typeof updateSubDepartmentSchema>;
export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;
export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;
export type UpdateDesignationInput = z.infer<typeof updateDesignationSchema>;
export type CreateStructureInput = z.infer<typeof createStructureSchema>;
export type UpdateStructureInput = z.infer<typeof updateStructureSchema>;
