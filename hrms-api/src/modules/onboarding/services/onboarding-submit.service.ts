import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import { REQUIRED_SUBMIT_DOCUMENT_TYPES } from "@/modules/onboarding/constants";
import * as academicRepo from "@/modules/onboarding/repositories/academic.repository";
import * as documentRepo from "@/modules/onboarding/repositories/document.repository";
import * as identityRepo from "@/modules/onboarding/repositories/identity.repository";
import { writeAuditLogAsync } from "@/infrastructure/audit/audit-writer";
import { ApiError } from "@/middleware/error";

export async function submitOnboarding(employeeId: number) {
  const [emp, identity, academicCount, uploadedTypes] = await Promise.all([
      db
        .select({
          id: employees.id,
          onboardingStatus: employees.onboardingStatus,
          currentAddress: employees.currentAddress,
          permanentAddress: employees.permanentAddress,
          emergencyContactName: employees.emergencyContactName,
          emergencyContactPhone: employees.emergencyContactPhone,
        })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1)
        .then((rows) => rows[0]),
      identityRepo.getIdentityByEmployeeId(employeeId),
      academicRepo.countAcademicByEmployeeId(employeeId),
      documentRepo.listDocumentTypesForEmployee(employeeId),
    ]);

  if (!emp) {
    throw new ApiError(404, "NOT_FOUND", "Employee not found.");
  }

  if (emp.onboardingStatus === "COMPLETED") {
    throw new ApiError(400, "ALREADY_COMPLETED", "Onboarding is already completed.");
  }

  const missingPersonal: string[] = [];
  if (!emp.currentAddress?.trim()) missingPersonal.push("currentAddress");
  if (!emp.permanentAddress?.trim()) missingPersonal.push("permanentAddress");
  if (!emp.emergencyContactName?.trim()) {
    missingPersonal.push("emergencyContactName");
  }
  if (!emp.emergencyContactPhone?.trim()) {
    missingPersonal.push("emergencyContactPhone");
  }
  if (missingPersonal.length > 0) {
    throw new ApiError(
      400,
      "PROFILE_INCOMPLETE",
      `Missing personal fields: ${missingPersonal.join(", ")}.`,
    );
  }

  if (!identity?.panNumber || !identity?.aadhaarNumber) {
    throw new ApiError(
      400,
      "IDENTITY_INCOMPLETE",
      "PAN and Aadhaar identity details are required.",
    );
  }

  if (academicCount < 1) {
    throw new ApiError(
      400,
      "ACADEMIC_INCOMPLETE",
      "At least one academic record is required.",
    );
  }

  const missingDocs = REQUIRED_SUBMIT_DOCUMENT_TYPES.filter(
    (type) => !uploadedTypes.has(type),
  );
  if (missingDocs.length > 0) {
    throw new ApiError(
      400,
      "DOCUMENTS_INCOMPLETE",
      `Missing required documents: ${missingDocs.join(", ")}.`,
    );
  }

  const support = await getEmployeeColumnSupport();
  const now = new Date();
  const patch: Record<string, unknown> = { updatedAt: now };
  if (support.onboardingStatus) {
    patch.onboardingStatus = "IN_PROGRESS";
  }
  if (support.onboardingSubmittedAt) {
    patch.onboardingSubmittedAt = now;
  } else {
    throw new ApiError(
      503,
      "SCHEMA_NOT_READY",
      "Onboarding submit is unavailable until database migrations are applied. Run: npm run db:migrate-onboarding-pending",
    );
  }

  const returning: Record<string, unknown> = {};
  if (support.onboardingStatus) {
    returning.onboardingStatus = employees.onboardingStatus;
  }
  if (support.onboardingSubmittedAt) {
    returning.onboardingSubmittedAt = employees.onboardingSubmittedAt;
  }

  const [updated] = await db
    .update(employees)
    .set(patch as Partial<typeof employees.$inferInsert>)
    .where(eq(employees.id, employeeId))
    .returning(returning as Record<string, typeof employees.id>);

  writeAuditLogAsync({
    action: "ONBOARDING_SUBMITTED",
    entityType: "employee",
    entityId: String(employeeId),
  });

  return {
    submitted: true,
    onboardingStatus: updated?.onboardingStatus ?? "IN_PROGRESS",
    submittedAt:
      updated?.onboardingSubmittedAt?.toISOString() ?? now.toISOString(),
  };
}
