import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

/**
 * Loads the employee row linked to the authenticated user (via
 * employees.user_id ↔ users.id). Throws 404 if no employee row is linked —
 * the auth account exists but no HR profile was seeded for it.
 */
export async function loadCurrentEmployee(userId: string) {
  const [emp] = await db
    .select({
      id: employees.id,
      empId: employees.empId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      workEmail: employees.workEmail,
      personalEmail: employees.personalEmail,
      phone: employees.phone,
      gender: employees.gender,
      joiningDate: employees.joiningDate,
      profilePhotoUrl: employees.profilePhotoUrl,
      designationId: employees.designationId,
      departmentId: employees.departmentId,
      gradeId: employees.gradeId,
      branchId: employees.branchId,
      reportingManagerId: employees.reportingManagerId,
    })
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
  return emp;
}

/**
 * Loads the current manager. A "manager" here means an employee that has at
 * least one direct report (employees.reporting_manager_id = me.id). If the
 * authenticated user is linked to an employee but no one reports to them,
 * returns 403.
 */
export async function loadCurrentManager(userId: string) {
  const me = await loadCurrentEmployee(userId);
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
