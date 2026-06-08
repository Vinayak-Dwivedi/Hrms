import { z } from "zod";
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

export const academicDetailSchema = z.object({
  id: z.number().int().positive().optional(),
  qualification: z.string().trim().min(1).max(100),
  institution: z.string().trim().min(1).max(200),
  boardUniversity: z.string().trim().max(200).optional().nullable(),
  fieldOfStudy: z.string().trim().max(100).optional().nullable(),
  yearFrom: z.number().int().min(1950).max(2100).optional().nullable(),
  yearTo: z.number().int().min(1950).max(2100).optional().nullable(),
  gradeOrPercentage: z.string().trim().max(20).optional().nullable(),
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
  panNumber: indianPanSchema,
  aadhaarNumber: indianAadhaarSchema,
  passportNumber: z.string().trim().max(20).optional().nullable(),
  passportExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  uanNumber: indianUanSchema,
  esicNumber: indianEsicSchema,
});

export const personalSchema = z.object({
  currentAddress: z.string().trim().min(1).max(5000),
  permanentAddress: z.string().trim().min(1).max(5000),
  emergencyContactName: z.string().trim().min(1).max(200),
  emergencyContactPhone: indianMobileSchema,
  fatherName: z.string().trim().max(200).optional().nullable(),
  motherName: z.string().trim().max(200).optional().nullable(),
  bloodGroup: z.string().trim().max(5).optional().nullable(),
  nationality: z.string().trim().max(50).optional(),
});

export const upsertProfileSchema = z.object({
  personal: personalSchema,
  identity: identitySchema,
  academic: z.array(academicDetailSchema).max(MAX_ACADEMIC_RECORDS).default([]),
  professional: z.array(professionalDetailSchema).default([]),
  bank: z.array(bankDetailSchema).default([]),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;
