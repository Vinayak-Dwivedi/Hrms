import { and, eq, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employees } from "@/db/schema/hrms";
import {
  getEmployeeColumnSupport,
  inferOnboardingStatus,
} from "@/lib/employee-schema-compat";

export async function refreshExpiredInvitations(): Promise<number> {
  const support = await getEmployeeColumnSupport();
  if (!support.onboardingStatus) {
    return 0;
  }
  const now = new Date();
  const result = await db
    .update(employees)
    .set({ onboardingStatus: "EXPIRED", updatedAt: now })
    .where(
      and(
        inArray(employees.onboardingStatus, ["PENDING", "INVITATION_SENT"]),
        lt(employees.onboardingTokenExpiry, now),
        ne(employees.onboardingStatus, "COMPLETED"),
      ),
    )
    .returning({ id: employees.id });
  return result.length;
}

export async function ensureInvitationStatusFresh(employeeId: number) {
  await refreshExpiredInvitations();
  const support = await getEmployeeColumnSupport();
  const selectShape: Record<string, unknown> = {
    id: employees.id,
    onboardingToken: employees.onboardingToken,
    onboardingTokenExpiry: employees.onboardingTokenExpiry,
    onboardingTokenUsed: employees.onboardingTokenUsed,
    onboardingCompletedAt: employees.onboardingCompletedAt,
  };
  if (support.onboardingStatus) {
    selectShape.onboardingStatus = employees.onboardingStatus;
  }
  if (support.onboardingSubmittedAt) {
    selectShape.onboardingSubmittedAt = employees.onboardingSubmittedAt;
  }

  const [emp] = await db
    .select(selectShape as {
      id: typeof employees.id;
      onboardingToken: typeof employees.onboardingToken;
      onboardingTokenExpiry: typeof employees.onboardingTokenExpiry;
      onboardingTokenUsed: typeof employees.onboardingTokenUsed;
      onboardingCompletedAt: typeof employees.onboardingCompletedAt;
      onboardingStatus?: typeof employees.onboardingStatus;
      onboardingSubmittedAt?: typeof employees.onboardingSubmittedAt;
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!emp) return null;
  return {
    id: emp.id,
    onboardingStatus: inferOnboardingStatus(emp),
    onboardingTokenExpiry: emp.onboardingTokenExpiry,
    onboardingCompletedAt: emp.onboardingCompletedAt,
    // Propagate so callers (e.g. approveOnboarding) can gate on "has the
    // employee actually submitted yet?" — null when the optional column
    // isn't supported by the running schema version.
    onboardingSubmittedAt: emp.onboardingSubmittedAt ?? null,
  };
}
