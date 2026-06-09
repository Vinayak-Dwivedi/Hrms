import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import * as academicRepo from "@/modules/onboarding/repositories/academic.repository";
import * as bankRepo from "@/modules/onboarding/repositories/bank.repository";
import * as documentRepo from "@/modules/onboarding/repositories/document.repository";
import * as identityRepo from "@/modules/onboarding/repositories/identity.repository";
import * as professionalRepo from "@/modules/onboarding/repositories/professional.repository";
import type { UpsertProfileInput } from "@/modules/onboarding/schemas/profile.schema";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { ApiError } from "@/middleware/error";
import {
  employeeDetailSelect,
  getEmployeeColumnSupport,
} from "@/lib/employee-schema-compat";
import {
  decryptEmployeeLegacyRow,
  encryptEmployeeLegacySensitive,
} from "@/lib/sensitive-employee-fields";

async function getEmployeeRow(employeeId: number) {
  const support = await getEmployeeColumnSupport();
  const selectFields = {
    ...(employeeDetailSelect(support) as Record<string, unknown>),
  };
  if (support.employeeSensitiveHashes) {
    selectFields.panNoHash = employees.panNoHash;
    selectFields.aadhaarNoHash = employees.aadhaarNoHash;
    selectFields.uanNoHash = employees.uanNoHash;
    selectFields.esicNoHash = employees.esicNoHash;
  }
  const [row] = await db
    .select(selectFields as Record<string, typeof employees.id>)
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }
  return decryptEmployeeLegacyRow(row as Record<string, unknown>);
}

function mapAcademic(rows: Awaited<ReturnType<typeof academicRepo.listAcademicByEmployeeId>>) {
  return rows.map((r) => ({
    id: r.id,
    qualification: r.qualification,
    institution: r.institution,
    boardUniversity: r.boardUniversity,
    fieldOfStudy: r.fieldOfStudy,
    yearFrom: r.yearFrom,
    yearTo: r.yearTo,
    gradeOrPercentage: r.gradeOrPercentage,
  }));
}

function mapProfessional(
  rows: Awaited<ReturnType<typeof professionalRepo.listProfessionalByEmployeeId>>,
) {
  return rows.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    designation: r.designation,
    fromDate: r.fromDate,
    toDate: r.toDate,
    isCurrent: r.isCurrent,
    responsibilities: r.responsibilities,
  }));
}

function mapBank(rows: Awaited<ReturnType<typeof bankRepo.listBankByEmployeeId>>) {
  return rows.map((r) => ({
    id: r.id,
    accountNumber: r.accountNumber,
    accountName: r.accountName,
    bankName: r.bankName,
    branchName: r.branchName,
    ifscCode: r.ifscCode,
    isPrimary: r.isPrimary,
    passbookDocumentId: r.passbookDocumentId,
  }));
}

export async function getProfile(employeeId: number) {
  const emp = await getEmployeeRow(employeeId);
  const [identity, academic, professional, bank, documents] = await Promise.all([
    identityRepo.getIdentityByEmployeeId(employeeId),
    academicRepo.listAcademicByEmployeeId(employeeId),
    professionalRepo.listProfessionalByEmployeeId(employeeId),
    bankRepo.listBankByEmployeeId(employeeId),
    documentRepo.listDocumentsByEmployeeId(employeeId),
  ]);

  return {
    employeeId: emp.id,
    onboardingStatus: emp.onboardingStatus,
    completedAt: emp.onboardingCompletedAt?.toISOString() ?? null,
    personal: {
      currentAddress: emp.currentAddress,
      permanentAddress: emp.permanentAddress,
      emergencyContactName: emp.emergencyContactName,
      emergencyContactPhone: emp.emergencyContactPhone,
      fatherName: emp.fatherName,
      motherName: emp.motherName,
      bloodGroup: emp.bloodGroup,
      nationality: emp.nationality,
    },
    identity: identity
      ? {
          panNumber: identity.panNumber,
          aadhaarNumber: identity.aadhaarNumber,
          passportNumber: identity.passportNumber,
          passportExpiry: identity.passportExpiry,
          uanNumber: identity.uanNumber,
          esicNumber: identity.esicNumber,
        }
      : {
          panNumber: emp.panNo,
          aadhaarNumber: emp.aadhaarNo,
          passportNumber: null,
          passportExpiry: null,
          uanNumber: emp.uanNo,
          esicNumber: emp.esicNo,
        },
    academic: mapAcademic(academic),
    professional: mapProfessional(professional),
    bank: mapBank(bank),
    documents,
  };
}

export async function upsertProfile(
  employeeId: number,
  input: UpsertProfileInput,
  actorUserId?: string,
) {
  const columnSupport = await getEmployeeColumnSupport();
  await db.transaction(async (tx) => {
    let currentOnboardingStatus: string | undefined;
    if (columnSupport.onboardingStatus) {
      const [statusRow] = await tx
        .select({ onboardingStatus: employees.onboardingStatus })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);
      currentOnboardingStatus = statusRow?.onboardingStatus ?? undefined;
    }
    const encryptedLegacy = encryptEmployeeLegacySensitive(
      {
        panNo: input.identity.panNumber,
        aadhaarNo: input.identity.aadhaarNumber,
        uanNo: input.identity.uanNumber?.trim() || null,
        esicNo: input.identity.esicNumber?.trim() || null,
      },
      { includeHashes: columnSupport.employeeSensitiveEncryptionReady },
    );
    const employeePatch: Record<string, unknown> = {
      currentAddress: input.personal.currentAddress,
      permanentAddress: input.personal.permanentAddress,
      emergencyContactName: input.personal.emergencyContactName,
      emergencyContactPhone: input.personal.emergencyContactPhone,
      fatherName: input.personal.fatherName?.trim() || null,
      motherName: input.personal.motherName?.trim() || null,
      bloodGroup: input.personal.bloodGroup?.trim() || null,
      nationality: input.personal.nationality?.trim() || "Indian",
      ...encryptedLegacy,
      updatedAt: new Date(),
    };
    if (input.phone?.trim()) {
      employeePatch.phone = input.phone.trim();
    }
    if (input.personalEmail?.trim()) {
      employeePatch.personalEmail = input.personalEmail.trim().toLowerCase();
    }
    if (
      columnSupport.onboardingStatus &&
      currentOnboardingStatus !== "COMPLETED"
    ) {
      employeePatch.onboardingStatus = "IN_PROGRESS";
    }
    await tx
      .update(employees)
      .set(employeePatch)
      .where(eq(employees.id, employeeId));
  });

  await identityRepo.upsertIdentity(employeeId, input.identity);
  await academicRepo.syncAcademicDetails(employeeId, input.academic);
  await professionalRepo.syncProfessionalDetails(employeeId, input.professional);
  await bankRepo.syncBankDetails(employeeId, input.bank);

  writeAuditLogAsync({
    actorUserId,
    action: "PROFILE_UPDATED",
    entityType: "employee",
    entityId: String(employeeId),
  });

  return getProfile(employeeId);
}
