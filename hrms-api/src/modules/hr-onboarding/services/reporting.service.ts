import { and, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeDocuments, employees } from "@/db/schema/hrms";
import { refreshExpiredInvitations } from "@/modules/hr-onboarding/services/onboarding-status.service";

export async function getCompletionStats() {
  await refreshExpiredInvitations();

  const statusCounts = await db
    .select({
      status: employees.onboardingStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(employees)
    .groupBy(employees.onboardingStatus);

  const [avgRow] = await db
    .select({
      avgDays: sql<number | null>`
        avg(
          extract(epoch from (${employees.onboardingCompletedAt} - ${employees.createdAt})) / 86400
        )
      `,
    })
    .from(employees)
    .where(isNotNull(employees.onboardingCompletedAt));

  const total = statusCounts.reduce((s, r) => s + r.count, 0);
  const completed =
    statusCounts.find((r) => r.status === "COMPLETED")?.count ?? 0;

  return {
    byStatus: Object.fromEntries(
      statusCounts.map((r) => [r.status, r.count]),
    ),
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
    avgDaysToComplete: avgRow?.avgDays
      ? Math.round(Number(avgRow.avgDays) * 10) / 10
      : null,
  };
}

export async function getPendingOnboarding() {
  const rows = await db
    .select({
      id: employees.id,
      empId: employees.empId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      onboardingStatus: employees.onboardingStatus,
      onboardingSubmittedAt: employees.onboardingSubmittedAt,
    })
    .from(employees)
    .where(
      and(
        eq(employees.onboardingStatus, "IN_PROGRESS"),
        isNotNull(employees.onboardingSubmittedAt),
      ),
    );

  const withPendingDocs = [];
  for (const row of rows) {
    const docs = await db
      .select({
        documentType: employeeDocuments.documentType,
        status: employeeDocuments.status,
      })
      .from(employeeDocuments)
      .where(eq(employeeDocuments.employeeId, row.id));

    const pendingVerification = docs.filter((d) => d.status !== "Verified");
    if (pendingVerification.length > 0) {
      withPendingDocs.push({
        ...row,
        pendingDocuments: pendingVerification,
      });
    }
  }
  return withPendingDocs;
}

export async function getExpiredInvitations() {
  await refreshExpiredInvitations();
  const now = new Date();

  return db
    .select({
      id: employees.id,
      empId: employees.empId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      workEmail: employees.workEmail,
      onboardingStatus: employees.onboardingStatus,
      onboardingTokenExpiry: employees.onboardingTokenExpiry,
      onboardingTokenUsed: employees.onboardingTokenUsed,
    })
    .from(employees)
    .where(
      or(
        eq(employees.onboardingStatus, "EXPIRED"),
        and(
          inArray(employees.onboardingStatus, ["INVITATION_SENT", "PENDING"]),
          lt(employees.onboardingTokenExpiry, now),
        ),
      ),
    );
}
