import { z } from "zod";
import {
  MAX_ACADEMIC_RECORDS,
  QUAL_CLASS_10,
  QUAL_CLASS_12,
  QUAL_OTHER,
} from "@/features/onboarding/constants/academic";
import { MARITAL_STATUS_OPTIONS } from "@/features/onboarding/constants/personal";
import { BLOOD_GROUP_VALUES } from "@/features/onboarding/constants/blood-groups";
import {
  BOARD_ALPHA_ONLY_MESSAGE,
  GRADE_FORMAT_MESSAGE,
  INSTITUTION_ALPHA_ONLY_MESSAGE,
  isAlphaOnlyBoardUniversity,
  isAlphaOnlyInstitution,
  isValidNumericGrade,
} from "@/lib/academic-field-validation";
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
    .max(new Date().getFullYear(), "Enter a valid year.")
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
    const qualification = row.qualification.trim();
    const isSchoolQualification =
      qualification === QUAL_CLASS_10 || qualification === QUAL_CLASS_12;

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

    if (!isAlphaOnlyInstitution(row.institution)) {
      ctx.addIssue({
        code: "custom",
        path: ["institution"],
        message: INSTITUTION_ALPHA_ONLY_MESSAGE,
      });
    }

    if (!isAlphaOnlyBoardUniversity(row.boardUniversity ?? "")) {
      ctx.addIssue({
        code: "custom",
        path: ["boardUniversity"],
        message: BOARD_ALPHA_ONLY_MESSAGE,
      });
    }

    if (isSchoolQualification && !(row.boardUniversity ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["boardUniversity"],
        message: "Board / University is required.",
      });
    }

    if (row.yearTo == null) {
      ctx.addIssue({
        code: "custom",
        path: ["yearTo"],
        message: "Passing year is required.",
      });
    }

    if (!(row.gradeOrPercentage ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["gradeOrPercentage"],
        message: "Grade is required.",
      });
    }

    if (!isValidNumericGrade(row.gradeOrPercentage ?? "")) {
      ctx.addIssue({
        code: "custom",
        path: ["gradeOrPercentage"],
        message: GRADE_FORMAT_MESSAGE,
      });
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

export const professionalDetailInputSchema = z.object({
  id: z.number().optional(),
  companyName: z.string().optional().default(""),
  designation: z.string().optional().default(""),
  fromDate: z.string().optional().default(""),
  toDate: z.string().optional().default(""),
  isCurrent: z.boolean().optional().default(false),
  responsibilities: z.string().optional().default(""),
});

export type ProfessionalDetailInput = z.infer<
  typeof professionalDetailInputSchema
>;

export function refineProfessionalRows(
  rows: ProfessionalDetailInput[],
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = ["professional"],
) {
  if (rows.length > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Only one previous company record is allowed.",
      path: pathPrefix,
    });
    return;
  }
  if (rows.length === 0) return;

  const row = rows[0];
  if (!row.companyName?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, 0, "companyName"],
      message: "Company name is required.",
    });
  }
  if (!row.designation?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, 0, "designation"],
      message: "Designation is required.",
    });
  }
  const fromDate = row.fromDate?.trim() ?? "";
  if (!fromDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, 0, "fromDate"],
      message: "Use YYYY-MM-DD.",
    });
  }
  const toDate = row.toDate?.trim() ?? "";
  if (!toDate || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, 0, "toDate"],
      message: "End date is required.",
    });
  } else if (fromDate && toDate < fromDate) {
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, 0, "toDate"],
      message: "End date cannot be before start date.",
    });
  }
}

/** @deprecated Use professionalDetailInputSchema for form state. */
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
  currentAddress: z
    .string()
    .trim()
    .min(1, "Current address is required.")
    .max(200, "Current address must be 200 characters or fewer."),
  permanentAddress: z
    .string()
    .trim()
    .min(1, "Permanent address is required.")
    .max(200, "Permanent address must be 200 characters or fewer."),
  emergencyContactName: z
    .string()
    .trim()
    .min(1, "Emergency contact name is required."),
  emergencyContactPhone: indianMobileSchema,
  maritalStatus: z.enum(MARITAL_STATUS_OPTIONS, {
    message: "Marital status is required.",
  }),
  spouseName: z.string().trim().max(200).optional(),
  fatherName: z.string().trim().max(200).optional(),
  motherName: z.string().trim().max(200).optional(),
  bloodGroup: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || BLOOD_GROUP_VALUES.includes(value), {
      message: "Select a valid blood group.",
    }),
  nationality: z.string().trim().max(50).optional(),
  panNo: indianPanSchema,
  aadhaarNo: indianAadhaarSchema,
  uanNo: optionalUanSchema,
  esicNo: optionalEsicSchema,
  academic: z
    .array(academicDetailSchema)
    .min(1, "Add at least one academic record.")
    .max(
      MAX_ACADEMIC_RECORDS,
      `Maximum ${MAX_ACADEMIC_RECORDS} academic records allowed.`,
    )
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

      const class10Index = rows.findIndex(
        (r) => r.qualification === QUAL_CLASS_10,
      );
      const class12Index = rows.findIndex(
        (r) => r.qualification === QUAL_CLASS_12,
      );
      if (class10Index === -1) {
        ctx.addIssue({
          code: "custom",
          message: "Class 10 details are required.",
        });
      }
      if (class12Index === -1) {
        ctx.addIssue({
          code: "custom",
          message: "Class 12 details are required.",
        });
      }
      if (class10Index === -1 || class12Index === -1) return;

      const class10Year = rows[class10Index]?.yearTo;
      const class12Year = rows[class12Index]?.yearTo;
      if (class10Year == null || class12Year == null) return;

      if (class12Year < class10Year + 2) {
        ctx.addIssue({
          code: "custom",
          path: [class12Index, "yearTo"],
          message:
            class12Year < class10Year
              ? "Class 12 passing year cannot be before Class 10."
              : "Class 12 passing year must be at least 2 years after Class 10.",
        });
      }
    }),
  professional: z.array(professionalDetailInputSchema).max(1).default([]),
})
  .superRefine((data, ctx) => {
    if (data.maritalStatus === "Married" && !data.spouseName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Spouse name is required when marital status is Married.",
        path: ["spouseName"],
      });
    }
    refineProfessionalRows(data.professional, ctx);
  });

// z.input — this type drives form defaultValues / state. The academic schema
// transforms `qualificationOther` to `undefined` on output; using z.infer
// here would force the form state to also be `undefined`, which conflicts
// with the empty-string default the form actually holds.
export type OnboardingProfileValues = z.input<typeof onboardingProfileSchema>;
export type AcademicDetailValues = z.input<typeof academicDetailSchema>;
export type ProfessionalDetailValues = ProfessionalDetailInput;
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
  if (
    path[0] === "professional" &&
    typeof path[1] === "number" &&
    typeof path[2] === "string"
  ) {
    return `professional.${path[1]}.${path[2]}`;
  }
  if (path[0] === "professional") {
    return "professional";
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
  CLASS_10_CERTIFICATE,
  CLASS_12_CERTIFICATE,
  EDUCATIONAL_DOCUMENT_TYPES,
  getOnboardingDocumentSections,
  listRequiredOnboardingDocuments,
  MANDATORY_ONBOARDING_DOCUMENTS,
  ONBOARDING_DOCUMENT_SECTIONS,
  PROFESSIONAL_DOCUMENT_TYPES,
  REQUIRED_ONBOARDING_DOCUMENTS,
  type AcademicQualificationRef,
  type EducationalDocumentType,
  type OnboardingDocumentType,
  type ProfessionalDocumentType,
  type RequiredOnboardingDocument,
} from "../constants/documents";
