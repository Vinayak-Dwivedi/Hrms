import { desc, eq } from "drizzle-orm";
import { db } from "@/db/runtime";
import { employeeOnboardingTokens } from "@/db/schema/hrms";

export async function insertTokenHistory(params: {
  employeeId: number;
  tokenHash: string;
  expiresAt: Date;
  issuedBy?: string | null;
  issueReason: "CREATE" | "RESEND" | "REGENERATE" | "INVALIDATE";
}) {
  const [row] = await db
    .insert(employeeOnboardingTokens)
    .values({
      employeeId: params.employeeId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      issuedBy: params.issuedBy ?? null,
      issueReason: params.issueReason,
    })
    .returning();
  return row!;
}

export async function invalidateActiveTokens(employeeId: number) {
  await db
    .update(employeeOnboardingTokens)
    .set({ invalidatedAt: new Date() })
    .where(eq(employeeOnboardingTokens.employeeId, employeeId));
}

export async function markTokenUsed(tokenHash: string) {
  await db
    .update(employeeOnboardingTokens)
    .set({ usedAt: new Date() })
    .where(eq(employeeOnboardingTokens.tokenHash, tokenHash));
}

export async function listTokenHistory(employeeId: number) {
  return db
    .select({
      id: employeeOnboardingTokens.id,
      expiresAt: employeeOnboardingTokens.expiresAt,
      usedAt: employeeOnboardingTokens.usedAt,
      invalidatedAt: employeeOnboardingTokens.invalidatedAt,
      issueReason: employeeOnboardingTokens.issueReason,
      createdAt: employeeOnboardingTokens.createdAt,
    })
    .from(employeeOnboardingTokens)
    .where(eq(employeeOnboardingTokens.employeeId, employeeId))
    .orderBy(desc(employeeOnboardingTokens.createdAt));
}
