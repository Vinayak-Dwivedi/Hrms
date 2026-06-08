import { z } from "zod";
import {
  QUAL_CLASS_10,
  QUAL_CLASS_12,
  QUAL_OTHER,
} from "@/features/onboarding/constants/academic";
import {
  indianAadhaarSchema,
  indianBankAccountSchema,
  indianIfscSchema,
  indianMobileSchema,
  indianPanSchema,
  isValidIndianEsic,
  isValidIndianUan,
  normalizeEsic,
  normalizeUan,
} from "@/lib/india-validation";

const optionalYearSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce
    .number()
    .int()
    .min(1950, "Enter a valid year.")
    .max(new Date().getFullYear() + 1, "Enter a valid year.")
    .optional(),
);

export const academicDetailSchema = z
  .object({
    id: z.number().optional(),
    qualification: z.string().trim().min(1, "Select a qualification."),
    qualificationOther: z.string().trim().optional(),
    institution: z.string().trim().min(1, "Institution is required."),
    boardUniversity: z.string().trim().optional(),
    fieldOfStudy: z.string().trim().optional(),
    yearFrom: optionalYearSchema,
    yearTo: optionalYearSchema,
    gradeOrPercentage: z.string().trim().optional(),
  })
  .superRefine((row, ctx) => {
    if (row.qualification === QUAL_OTHER) {
      const other = row.qualificationOther?.trim() ?? "";
      if (other.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["qualificationOther"],
          message: "Enter the qualification name (at least 2 characters).",
        });
      }
    }
  })
  .transform((row) => ({
    ...row,
    qualification:
      row.qualification === QUAL_OTHER
        ? (row.qualificationOther ?? "").trim()
        : row.qualification,
    qualificationOther: undefined,
  }));

export const professionalDetailSchema = z.object({
  id: z.number().optional(),
  companyName: z.string().trim().min(1, "Company name is required."),
  designation: z.string().trim().min(1, "Designation is required."),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  isCurrent: z.boolean().optional(),
  responsibilities: z.string().trim().optional(),
});

export const bankDetailSchema = z.object({
  id: z.number().optional(),
  accountNumber: indianBankAccountSchema,
  accountName: z.string().trim().min(1, "Account name is required."),
  bankName: z.string().trim().min(1, "Bank name is required."),
  branchName: z.string().trim().min(1, "Branch name is required."),
  ifscCode: indianIfscSchema,
  isPrimary: z.boolean().optional(),
});

const optionalUanSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => normalizeUan(v ?? ""))
  .refine((v) => !v || isValidIndianUan(v), {
    message: "UAN must be exactly 12 digits.",
  });

const optionalEsicSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => normalizeEsic(v ?? ""))
  .refine((v) => !v || isValidIndianEsic(v), {
    message: "ESIC number must be 10 or 17 digits.",
  });

export const onboardingProfileSchema = z.object({
  currentAddress: z.string().trim().min(1, "Current address is required."),
  permanentAddress: z.string().trim().min(1, "Permanent address is required."),
  emergencyContactName: z
    .string()
    .trim()
    .min(1, "Emergency contact name is required."),
  emergencyContactPhone: indianMobileSchema,
  fatherName: z.string().trim().max(200).optional(),
  motherName: z.string().trim().max(200).optional(),
  bloodGroup: z.string().trim().max(5).optional(),
  nationality: z.string().trim().max(50).optional(),
  panNo: indianPanSchema,
  aadhaarNo: indianAadhaarSchema,
  uanNo: optionalUanSchema,
  esicNo: optionalEsicSchema,
  academic: z
    .array(academicDetailSchema)
    .min(1, "Add at least one academic record.")
    .max(10, "Maximum 10 academic records allowed.")
    .superRefine((rows, ctx) => {
      const class10 = rows.filter((r) => r.qualification === QUAL_CLASS_10).length;
      const class12 = rows.filter((r) => r.qualification === QUAL_CLASS_12).length;
      if (class10 > 1) {
        ctx.addIssue({
          code: "custom",
          message: "Only one Class 10 record is allowed.",
        });
      }
      if (class12 > 1) {
        ctx.addIssue({
          code: "custom",
          message: "Only one Class 12 record is allowed.",
        });
      }
    }),
  professional: z.array(professionalDetailSchema).default([]),
  bank: z
    .array(bankDetailSchema)
    .min(1, "Add at least one bank account.")
    .refine((rows) => rows.some((r) => r.isPrimary === true), {
      message: "Mark one bank account as primary.",
    }),
});

// z.input — this type drives form defaultValues / state. The academic schema
// transforms `qualificationOther` to `undefined` on output; using z.infer
// here would force the form state to also be `undefined`, which conflicts
// with the empty-string default the form actually holds.
export type OnboardingProfileValues = z.input<typeof onboardingProfileSchema>;
export type AcademicDetailValues = z.input<typeof academicDetailSchema>;
export type ProfessionalDetailValues = z.infer<typeof professionalDetailSchema>;
export type BankDetailValues = z.infer<typeof bankDetailSchema>;

export {
  EDUCATIONAL_DOCUMENT_TYPES,
  ONBOARDING_DOCUMENT_SECTIONS,
  PROFESSIONAL_DOCUMENT_TYPES,
  REQUIRED_ONBOARDING_DOCUMENTS,
  type EducationalDocumentType,
  type OnboardingDocumentType,
  type ProfessionalDocumentType,
  type RequiredOnboardingDocument,
} from "../constants/documents";
