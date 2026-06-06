#!/usr/bin/env node
/** Post-migrate checks for Phase 2/3 onboarding schema. */

import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

async function main() {
  console.log("=== Onboarding schema verification ===\n");

  const journal = await sql`
    SELECT id, left(hash, 12) AS hash_prefix, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at
  `;
  console.log(`Migration journal rows: ${journal.length}`);
  for (const row of journal) {
    console.log(`  ${row.created_at}  ${row.hash_prefix}…`);
  }

  const enumLabels = await sql`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'onboarding_status_enum'
    ORDER BY e.enumsortorder
  `;
  console.log(
    `\nonboarding_status_enum: ${enumLabels.map((r) => r.enumlabel).join(", ") || "(missing)"}`,
  );

  const onboardingCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name LIKE 'onboarding%'
    ORDER BY column_name
  `;
  console.log(
    `employees onboarding columns: ${onboardingCols.map((r) => r.column_name).join(", ") || "(none)"}`,
  );

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'employee_academic_details',
        'employee_identity_details',
        'employee_bank_details',
        'audit_logs',
        'employee_onboarding_tokens'
      )
    ORDER BY table_name
  `;
  console.log(
    `onboarding tables present: ${tables.map((r) => r.table_name).join(", ") || "(none)"}`,
  );

  const perms = await sql`
    SELECT code FROM permissions
    WHERE code LIKE 'onboarding.%'
    ORDER BY code
  `;
  console.log(
    `onboarding permissions: ${perms.map((r) => r.code).join(", ") || "(none — run npm run seed:rbac)"}`,
  );

  const phase3Ok =
    enumLabels.some((r) => r.enumlabel === "PENDING") &&
    tables.some((r) => r.table_name === "audit_logs");
  const phase2Ok = tables.some(
    (r) => r.table_name === "employee_academic_details",
  );

  console.log(`\nPhase 2 schema: ${phase2Ok ? "OK" : "INCOMPLETE"}`);
  console.log(`Phase 3 schema: ${phase3Ok ? "OK" : "INCOMPLETE"}`);

  if (!phase2Ok || !phase3Ok) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end());
