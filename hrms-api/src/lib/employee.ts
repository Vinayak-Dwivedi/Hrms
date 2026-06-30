import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import { getEmployeeColumnSupport } from "@/lib/employee-schema-compat";
import { ApiError } from "@/middleware/error";

export function formatEmployeeFullName(parts: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [parts.firstName, parts.middleName, parts.lastName]
    .filter((part) => part?.trim())
    .join(" ");
}

export type CurrentEmployee = {
  id: number;
  empId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  workEmail: string | null;
  personalEmail: string;
  personalEmailVerified: boolean;
  personalEmailVerifiedAt: Date | null;
  phone: string;
  phoneVerified: boolean;
  phoneVerifiedAt: Date | null;
  gender: string;
  dob: string;
  joiningDate: string;
  profilePhotoUrl: string | null;
  designationId: number | null;
  departmentId: number | null;
  gradeId: number | null;
  branchId: number | null;
  employmentTypeId: number | null;
  orgHierarchyStructureId: number | null;
  reportingManagerId: number | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

/**
 * Loads the employee row linked to the authenticated user (via
 * employees.user_id ↔ users.id). Throws 404 if no employee row is linked —
 * the auth account exists but no HR profile was seeded for it.
 */
export async function loadCurrentEmployee(
  userId: string,
): Promise<CurrentEmployee> {
  const support = await getEmployeeColumnSupport();
  const selectFields: Record<string, unknown> = {
    id: employees.id,
    empId: employees.empId,
    firstName: employees.firstName,
    lastName: employees.lastName,
    middleName: employees.middleName,
    workEmail: employees.workEmail,
    personalEmail: employees.personalEmail,
    phone: employees.phone,
    gender: employees.gender,
    dob: employees.dob,
    joiningDate: employees.joiningDate,
    profilePhotoUrl: employees.profilePhotoUrl,
    designationId: employees.designationId,
    departmentId: employees.departmentId,
    gradeId: employees.gradeId,
    branchId: employees.branchId,
    employmentTypeId: employees.employmentTypeId,
    orgHierarchyStructureId: employees.orgHierarchyStructureId,
    reportingManagerId: employees.reportingManagerId,
    currentAddress: employees.currentAddress,
    permanentAddress: employees.permanentAddress,
    emergencyContactName: employees.emergencyContactName,
    emergencyContactPhone: employees.emergencyContactPhone,
  };

  if (support.personalEmailVerified) {
    selectFields.personalEmailVerified = employees.personalEmailVerified;
    selectFields.personalEmailVerifiedAt = employees.personalEmailVerifiedAt;
  }

  if (support.phoneVerified) {
    selectFields.phoneVerified = employees.phoneVerified;
    selectFields.phoneVerifiedAt = employees.phoneVerifiedAt;
  }

  const [emp] = await db
    .select(selectFields as Record<string, typeof employees.id>)
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);

  if (!emp) {
    throw new ApiError(
      404,
      "NO_EMPLOYEE_FOR_USER",
      "Authenticated user has no linked employee record.",
    );
  }

  const row = emp as Record<string, unknown>;

  return {
    id: row.id as number,
    empId: row.empId as string,
    firstName: row.firstName as string,
    lastName: row.lastName as string,
    middleName: (row.middleName as string | null) ?? null,
    workEmail: (row.workEmail as string | null) ?? null,
    personalEmail: row.personalEmail as string,
    personalEmailVerified: support.personalEmailVerified
      ? Boolean(row.personalEmailVerified)
      : false,
    personalEmailVerifiedAt: support.personalEmailVerified
      ? ((row.personalEmailVerifiedAt as Date | null) ?? null)
      : null,
    phone: row.phone as string,
    phoneVerified: support.phoneVerified
      ? Boolean(row.phoneVerified)
      : false,
    phoneVerifiedAt: support.phoneVerified
      ? ((row.phoneVerifiedAt as Date | null) ?? null)
      : null,
    gender: row.gender as string,
    dob: row.dob as string,
    joiningDate: row.joiningDate as string,
    profilePhotoUrl: (row.profilePhotoUrl as string | null) ?? null,
    designationId: (row.designationId as number | null) ?? null,
    departmentId: (row.departmentId as number | null) ?? null,
    gradeId: (row.gradeId as number | null) ?? null,
    branchId: (row.branchId as number | null) ?? null,
    employmentTypeId: (row.employmentTypeId as number | null) ?? null,
    orgHierarchyStructureId: (row.orgHierarchyStructureId as number | null) ?? null,
    reportingManagerId: (row.reportingManagerId as number | null) ?? null,
    currentAddress: (row.currentAddress as string | null) ?? null,
    permanentAddress: (row.permanentAddress as string | null) ?? null,
    emergencyContactName: (row.emergencyContactName as string | null) ?? null,
    emergencyContactPhone: (row.emergencyContactPhone as string | null) ?? null,
  };
}

/**
 * Loads the current manager. A "manager" here means an employee that has at
 * least one direct report (employees.reporting_manager_id = me.id). If the
 * authenticated user is linked to an employee but no one reports to them,
 * returns 403 — UNLESS the JWT role is "master" (admin), in which case the
 * check is bypassed so admins can access team views even with no direct reports.
 */
export async function loadCurrentManager(userId: string, jwtRole?: string) {
  const me = await loadCurrentEmployee(userId);
  if (jwtRole !== "master") {
    const [report] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.reportingManagerId, me.id))
      .limit(1);
    if (!report) {
      throw new ApiError(
        403,
        "NOT_A_MANAGER",
        "Authenticated user is not a reporting manager.",
      );
    }
  }
  return me;
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayYmd() {
  return ymd(new Date());
}

export function startEndOfMonth(year: number, month0: number) {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  return { start: ymd(start), end: ymd(end) };
}
