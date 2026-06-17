import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date.");

// Employee submits a resignation. Attachment (if any) arrives as a multipart
// file and is handled in the controller, not here.
export const submitResignationSchema = z.object({
  lastWorkingDate: dateString,
  reason: z.string().trim().min(1).max(120),
  detailedRemark: z.string().trim().min(1).max(2000),
  // Multipart sends "true"/"false" strings — coerce.boolean would treat "false"
  // as truthy, so match the literal string instead.
  buyoutRequested: z
    .preprocess((v) => v === true || v === "true", z.boolean())
    .optional()
    .default(false),
});
export type SubmitResignationInput = z.infer<typeof submitResignationSchema>;

// Manager approves (with inputs) or rejects.
export const managerApproveSchema = z.object({
  recommendedLwd: dateString.optional().nullable(),
  knowledgeTransferRequired: z.boolean().optional().default(false),
  replacementRequired: z.boolean().optional().default(false),
  criticalResource: z.boolean().optional().default(false),
  remarks: z.string().trim().max(2000).optional().nullable(),
});
export type ManagerApproveInput = z.infer<typeof managerApproveSchema>;

export const decisionRemarksSchema = z.object({
  remarks: z.string().trim().max(2000).optional().nullable(),
});

// HR approval — verification fields + optional modified LWD.
export const hrApproveSchema = z.object({
  modifiedLwd: dateString.optional().nullable(),
  leaveEncashmentEligible: z.boolean().optional().default(false),
  recoveryAmount: z.coerce.number().min(0).optional().nullable(),
  gratuityEligible: z.boolean().optional().default(false),
  finalSettlementEligible: z.boolean().optional().default(true),
  remarks: z.string().trim().max(2000).optional().nullable(),
});
export type HrApproveInput = z.infer<typeof hrApproveSchema>;

// Admin: resignation-flow bundle (flow + scope rows).
const SCOPE_TYPES = [
  "Company",
  "Branch",
  "Location",
  "Department",
  "SubDepartment",
  "Designation",
  "Grade",
  "EmploymentType",
  "Employee",
] as const;

const scopeRowSchema = z.object({
  scopeType: z.enum(SCOPE_TYPES),
  scopeId: z.number().int().positive().nullable().optional(),
  priority: z.number().int().min(0).max(10000).optional().default(100),
});

export const flowUpsertSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  noticePeriodDays: z.number().int().min(0).max(365).default(30),
  buyoutAllowed: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  scope: z.array(scopeRowSchema).default([]),
});
export type FlowUpsertInput = z.infer<typeof flowUpsertSchema>;

export const flowPatchSchema = flowUpsertSchema.partial();

// Admin: exit reasons.
export const exitReasonUpsertSchema = z.object({
  label: z.string().trim().min(1).max(120),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(100),
});
export const exitReasonPatchSchema = exitReasonUpsertSchema.partial();
export type ExitReasonUpsertInput = z.infer<typeof exitReasonUpsertSchema>;

// Phase 2 — clearance template + task.
export const clearanceTemplatePatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  tasks: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const clearanceTaskUpdateSchema = z.object({
  status: z.enum(["Pending", "Completed", "NA"]).optional(),
  remarks: z.string().trim().max(1000).optional().nullable(),
});

// Phase 3 — exit interview.
const QUESTION_TYPES = [
  "yes_no",
  "nps",
  "star",
  "rating_scale",
  "single_choice",
  "multiple_choice",
  "comments",
  "date",
] as const;

const exitQuestionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  type: z.enum(QUESTION_TYPES),
  label: z.string().trim().min(1).max(300),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  scaleMax: z.number().int().min(2).max(10).optional(),
});

export const exitTemplateUpsertSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  questions: z.array(exitQuestionSchema).min(1).max(50),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});
export const exitTemplatePatchSchema = exitTemplateUpsertSchema.partial();

export const exitInterviewSubmitSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

// Phase 4 — FnF.
export const fnfLineAddSchema = z.object({
  kind: z.enum(["Earning", "Deduction"]),
  label: z.string().trim().min(1).max(150),
  amount: z.coerce.number().min(0).max(99_999_999).default(0),
});
export const fnfLineUpdateSchema = z.object({
  label: z.string().trim().min(1).max(150).optional(),
  amount: z.coerce.number().min(0).max(99_999_999).optional(),
});
export const fnfNotesSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable(),
});

// Phase 5 — exit document templates.
export const docTemplateUpsertSchema = z.object({
  name: z.string().trim().min(1).max(150),
  category: z.enum(["HR", "Finance", "Employee"]),
  htmlTemplate: z.string().min(1).max(20000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(100),
});
export const docTemplatePatchSchema = docTemplateUpsertSchema.partial();
