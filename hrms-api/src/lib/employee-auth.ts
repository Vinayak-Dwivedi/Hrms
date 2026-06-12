import { eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const ACCOUNT_INACTIVE_CODE = "ACCOUNT_INACTIVE";

export const ACCOUNT_INACTIVE_MESSAGE =
  "Your account is not active. Please contact HR.";

/** Block sign-in / session refresh when the linked employee is not Active. */
export async function assertEmployeeMayAuthenticate(
  userId: string,
): Promise<void> {
  const [emp] = await db
    .select({ employeeStatus: employees.employeeStatus })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);

  if (!emp) return;

  if (emp.employeeStatus !== "Active") {
    throw new ApiError(403, ACCOUNT_INACTIVE_CODE, ACCOUNT_INACTIVE_MESSAGE);
  }
}
