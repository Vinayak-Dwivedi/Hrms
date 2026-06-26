import { z } from "zod";
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
  indianEsicSchema,
  indianIfscSchema,
  indianMobileSchema,
  indianPanSchema,
  indianUanSchema,
} from "@/lib/india-validation";
import { MAX_ACADEMIC_RECORDS } from "@/modules/onboarding/constants/academic";
import { MARITAL_STATUS_OPTIONS } from "@/modules/onboarding/constants/personal";
import { BLOOD_GROUP_VALUES } from "@/modules/onboarding/constants/blood-groups";

const CURRENT_PASSING_YEAR = new Date().getFullYear();

export const academicDetailSchema = z
  .object({
    id: z.number().int().positive().optional(),
    qualification: z.string().trim().min(1).max(100),
    institution: z.string().trim().min(1).max(200),
    boardUniversity: z.string().trim().max(200).optional().nullable(),
    fieldOfStudy: z.string().trim().max(100).optional().nullable(),
    yearFrom: z.number().int().min(1950).max(CURRENT_PASSING_YEAR).optional().nullable(),
    yearTo: z.number().int().min(1950).max(CURRENT_PASSING_YEAR).optional().nullable(),
    gradeOrPercentage: z.string().trim().max(20).optional().nullable(),
  })
  .superRefine((row, ctx) => {
    const qualification = row.qualification.trim();
    const isSchoolQualification = /^Class (10|12)\b/.test(qualification);

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
  });

export const professionalDetailSchema = z.object({
  id: z.number().int().positive().optional(),
  companyName: z.string().trim().min(1).max(200),
  designation: z.string().trim().min(1).max(100),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  isCurrent: z.boolean().optional().default(false),
  responsibilities: z.string().trim().max(5000).optional().nullable(),
});

export const bankDetailSchema = z.object({
  id: z.number().int().positive().optional(),
  accountNumber: indianBankAccountSchema,
  accountName: z.string().trim().min(1).max(100),
  bankName: z.string().trim().min(1).max(100),
  branchName: z.string().trim().min(1).max(100),
  ifscCode: indianIfscSchema,
  isPrimary: z.boolean().optional().default(false),
  passbookDocumentId: z.string().uuid().optional().nullable(),
});

export const identitySchema = z.object({
  panNumber: z.union([z.literal(""), indianPanSchema]),
  aadhaarNumber: z.union([z.literal(""), indianAadhaarSchema]),
  passportNumber: z.string().trim().max(20).optional().nullable(),
  passportExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  uanNumber: indianUanSchema,
  esicNumber: indianEsicSchema,
});

export const personalSchema = z
  .object({
    currentAddress: z.string().trim().max(5000).default(""),
    permanentAddress: z.string().trim().max(5000).default(""),
    emergencyContactName: z.string().trim().max(200).default(""),
    emergencyContactPhone: z.union([z.literal(""), indianMobileSchema]).default(""),
    maritalStatus: z.enum(MARITAL_STATUS_OPTIONS),
    spouseName: z.string().trim().max(200).optional().nullable(),
    fatherName: z.string().trim().max(200).optional().nullable(),
    motherName: z.string().trim().max(200).optional().nullable(),
    bloodGroup: z
      .string()
      .trim()
      .max(5)
      .optional()
      .nullable()
      .refine((value) => !value || BLOOD_GROUP_VALUES.includes(value), {
        message: "Select a valid blood group.",
      }),
    nationality: z.string().trim().max(50).optional(),
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

export const upsertProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number")
    .optional(),
  personalEmail: z.string().trim().email().max(255).optional(),
  personal: personalSchema,
  identity: identitySchema,
  academic: z
    .array(academicDetailSchema)
    .max(MAX_ACADEMIC_RECORDS)
    .default([]),
  professional: z
    .array(professionalDetailSchema)
    .max(1, "Only one previous company record is allowed.")
    .default([])
    .superRefine((rows, ctx) => {
      if (rows.length !== 1) return;
      const row = rows[0];
      if (!row.toDate) {
        ctx.addIssue({
          code: "custom",
          path: [0, "toDate"],
          message: "End date is required.",
        });
      }
      if (row.toDate && row.fromDate && row.toDate < row.fromDate) {
        ctx.addIssue({
          code: "custom",
          path: [0, "toDate"],
          message: "End date cannot be before start date.",
        });
      }
    }),
  bank: z.array(bankDetailSchema).optional(),
});

export const upsertBankDetailsSchema = z.object({
  bank: z
    .array(bankDetailSchema)
    .min(1, "Add at least one bank account.")
    .refine((rows) => rows.some((r) => r.isPrimary === true), {
      message: "Mark one bank account as primary.",
    }),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;
export type UpsertBankDetailsInput = z.infer<typeof upsertBankDetailsSchema>;
