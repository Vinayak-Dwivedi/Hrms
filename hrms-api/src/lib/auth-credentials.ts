import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/runtime";
import { accounts, users } from "@/db/schema";
import { employees } from "@/db/schema/hrms";
import { ApiError } from "@/middleware/error";

export const CREDENTIAL_PROVIDER = "credential";

export const PERSONAL_EMAIL_LOGIN_CODE = "PERSONAL_EMAIL_LOGIN";

export const PERSONAL_EMAIL_LOGIN_MESSAGE =
  "Personal email cannot be used to sign in. Use your work email or employee ID.";

export type CredentialRow = {
  userId: string;
  email: string;
  name: string;
  role: string;
  password: string;
};

export function isEmailLoginId(loginId: string): boolean {
  return loginId.includes("@");
}

export function normalizeEmailLoginId(loginId: string): string {
  return loginId.trim().toLowerCase();
}

function toCredentialRow(row: {
  userId: string;
  email: string;
  name: string;
  role: string;
  password: string | null;
}): CredentialRow | null {
  if (!row.password) return null;
  return {
    userId: row.userId,
    email: row.email,
    name: row.name,
    role: row.role,
    password: row.password,
  };
}

const credentialSelect = {
  userId: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  password: accounts.password,
};

function credentialAccountJoin() {
  return and(
    eq(accounts.userId, users.id),
    eq(accounts.providerId, CREDENTIAL_PROVIDER),
  );
}

export async function lookupCredentialByUsersEmail(
  email: string,
): Promise<CredentialRow | null> {
  const normalized = normalizeEmailLoginId(email);
  const [row] = await db
    .select(credentialSelect)
    .from(users)
    .innerJoin(accounts, credentialAccountJoin())
    .where(eq(users.email, normalized))
    .limit(1);
  return row ? toCredentialRow(row) : null;
}

export async function lookupCredentialByWorkEmail(
  email: string,
): Promise<CredentialRow | null> {
  const normalized = normalizeEmailLoginId(email);
  const [row] = await db
    .select(credentialSelect)
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .innerJoin(accounts, credentialAccountJoin())
    .where(sql`lower(${employees.workEmail}::text) = ${normalized}`)
    .limit(1);
  return row ? toCredentialRow(row) : null;
}

export async function isPersonalEmailOnlyLogin(email: string): Promise<boolean> {
  const normalized = normalizeEmailLoginId(email);
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(sql`lower(${employees.personalEmail}::text) = ${normalized}`)
    .limit(1);
  return Boolean(row);
}

export async function lookupCredentialByEmail(
  email: string,
): Promise<CredentialRow | null> {
  const byUsersEmail = await lookupCredentialByUsersEmail(email);
  if (byUsersEmail) return byUsersEmail;

  const byWorkEmail = await lookupCredentialByWorkEmail(email);
  if (byWorkEmail) return byWorkEmail;

  if (await isPersonalEmailOnlyLogin(email)) {
    throw new ApiError(
      401,
      PERSONAL_EMAIL_LOGIN_CODE,
      PERSONAL_EMAIL_LOGIN_MESSAGE,
    );
  }

  return null;
}

export async function lookupCredentialByEmpId(
  empId: string,
): Promise<CredentialRow | null> {
  const normalized = empId.trim().toLowerCase();
  const [row] = await db
    .select(credentialSelect)
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .innerJoin(accounts, credentialAccountJoin())
    .where(sql`lower(${employees.empId}) = ${normalized}`)
    .limit(1);
  return row ? toCredentialRow(row) : null;
}

export async function lookupCredentialWithLoginId(
  loginId: string,
): Promise<CredentialRow | null> {
  if (isEmailLoginId(loginId)) {
    return lookupCredentialByEmail(loginId);
  }
  return lookupCredentialByEmpId(loginId);
}
