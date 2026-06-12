#!/usr/bin/env node
/**
 * Add document rejection columns required for HR verify/reject flow.
 * Usage: node scripts/apply-onboarding-phase3-document-rejection.mjs
 */
import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

const STATEMENTS = [
  `ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "rejected_by" integer`,
  `ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "rejected_at" timestamptz`,
  `ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "rejection_reason" text`,
  `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_submitted_at" timestamptz`,
  `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_reviewed_by" integer`,
  `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_reviewed_at" timestamptz`,
  `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_review_notes" text`,
];

try {
  console.log("Applying onboarding phase-3 document and review columns…");
  await sql`SET client_min_messages TO WARNING`;
  for (const statement of STATEMENTS) {
    await sql.unsafe(statement);
  }

  try {
    await sql.unsafe(`
      ALTER TABLE "employee_documents"
      ADD CONSTRAINT "employee_documents_rejected_by_fkey"
      FOREIGN KEY ("rejected_by") REFERENCES "employees"("id") ON DELETE SET NULL
    `);
  } catch (e) {
    if (!/already exists|duplicate/i.test(e.message ?? "")) throw e;
  }

  try {
    await sql.unsafe(`
      ALTER TABLE "employees"
      ADD CONSTRAINT "employees_onboarding_reviewed_by_fkey"
      FOREIGN KEY ("onboarding_reviewed_by") REFERENCES "employees"("id") ON DELETE SET NULL
    `);
  } catch (e) {
    if (!/already exists|duplicate/i.test(e.message ?? "")) throw e;
  }

  console.log("Onboarding phase-3 columns ready.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
