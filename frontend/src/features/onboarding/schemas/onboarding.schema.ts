import { z } from "zod";
import { phoneFieldSchema } from "@/features/employees/schemas/employee.schema";
import {
  QUAL_CLASS_10,
  QUAL_CLASS_12,
  QUAL_OTHER,
} from "@/features/onboarding/constants/academic";
import {
  indianAadhaarSchema,
  indianBankAccountSchema,
  indianIfscSchema,
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

export const onboardingProfileSchema = z
  .object({
  currentAddress: z.string().trim().min(1, "Current address is required."),
  permanentAddress: z.string().trim().min(1, "Permanent address is required."),
  emergencyContactName: z
    .string()
    .trim()
    .min(1, "Emergency contact name is required."),
  emergencyContactPhone: phoneFieldSchema,
  maritalStatus: z.enum(["Single", "Married"], {
    message: "Marital status is required.",
  }),
  spouseName: z.string().trim().max(200).optional(),
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
})
  .superRefine((data, ctx) => {
    if (data.maritalStatus === "Married" && !data.spouseName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Spouse name is required when marital status is Married.",
        path: ["spouseName"],
      });
    }
  });

// z.input — this type drives form defaultValues / state. The academic schema
// transforms `qualificationOther` to `undefined` on output; using z.infer
// here would force the form state to also be `undefined`, which conflicts
// with the empty-string default the form actually holds.
export type OnboardingProfileValues = z.input<typeof onboardingProfileSchema>;
export type AcademicDetailValues = z.input<typeof academicDetailSchema>;
export type ProfessionalDetailValues = z.infer<typeof professionalDetailSchema>;
export type BankDetailValues = z.infer<typeof bankDetailSchema>;

export const onboardingBankFormSchema = z.object({
  bank: z
    .array(bankDetailSchema)
    .min(1, "Add at least one bank account.")
    .refine((rows) => rows.some((r) => r.isPrimary === true), {
      message: "Mark one bank account as primary.",
    }),
});

export type OnboardingBankFormValues = z.input<typeof onboardingBankFormSchema>;

export function onboardingProfileIssueToFieldKey(
  path: (string | number)[],
): string {
  if (path[0] === "academic" && path.length >= 3) {
    return `academic.${path[1]}.${path[2]}`;
  }
  return String(path[0] ?? "form");
}

export function onboardingBankIssueToFieldKey(
  path: (string | number)[],
): string {
  if (path[0] === "bank" && path.length >= 3) {
    return `bank.${path[1]}.${path[2]}`;
  }
  return path.map(String).join(".");
}

function collectSchemaErrors<T>(
  schema: z.ZodType<T>,
  values: T,
  toFieldKey: (path: (string | number)[]) => string,
): Record<string, string> {
  const parsed = schema.safeParse(values);
  if (parsed.success) return {};

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.filter(
      (p): p is string | number => typeof p !== "symbol",
    );
    const key = toFieldKey(path);
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export function collectOnboardingProfileErrors(
  values: OnboardingProfileValues,
): Record<string, string> {
  return collectSchemaErrors(
    onboardingProfileSchema,
    values,
    onboardingProfileIssueToFieldKey,
  );
}

export function collectOnboardingBankErrors(
  values: OnboardingBankFormValues,
): Record<string, string> {
  return collectSchemaErrors(
    onboardingBankFormSchema,
    values,
    onboardingBankIssueToFieldKey,
  );
}

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
