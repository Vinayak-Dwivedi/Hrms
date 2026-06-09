#!/usr/bin/env node
/**
 * Apply drizzle/20260608100000_sensitive_field_encryption/migration.sql
 * when any hash columns are missing (safe to re-run — uses IF NOT EXISTS).
 *
 * Run before: node scripts/migrate-encrypt-sensitive-fields.mjs
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILE = join(
  __dirname,
  "..",
  "drizzle",
  "20260608100000_sensitive_field_encryption",
  "migration.sql",
);

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

async function listMissingHashColumns() {
  const rows = await sql`
    SELECT required.table_name::text AS table_name, required.column_name::text AS column_name
    FROM (
      VALUES
        ('employees', 'pan_no_hash'),
        ('employee_identity_details', 'pan_number_hash'),
        ('employee_bank_details', 'account_number_hash')
    ) AS required(table_name, column_name)
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
      AND c.table_name = required.table_name
      AND c.column_name = required.column_name
    WHERE c.column_name IS NULL
  `;
  return rows.map((r) => `${r.table_name}.${r.column_name}`);
}

async function listColumnsNotYetText() {
  const rows = await sql`
    SELECT table_name::text AS table_name, column_name::text AS column_name, data_type::text AS data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'employees' AND column_name IN ('pan_no', 'aadhaar_no', 'uan_no', 'esic_no'))
        OR (table_name = 'employee_identity_details' AND column_name IN (
          'pan_number', 'aadhaar_number', 'passport_number', 'uan_number', 'esic_number'
        ))
        OR (table_name = 'employee_bank_details' AND column_name = 'account_number')
      )
      AND data_type <> 'text'
  `;
  return rows.map((r) => `${r.table_name}.${r.column_name} (${r.data_type})`);
}

async function listSchemaGaps() {
  const missingHashes = await listMissingHashColumns();
  const notText = await listColumnsNotYetText();
  return { missingHashes, notText };
}

function loadStatements() {
  const raw = readFileSync(MIGRATION_FILE, "utf8");
  return raw
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

try {
  let { missingHashes, notText } = await listSchemaGaps();
  if (missingHashes.length === 0 && notText.length === 0) {
    console.log("Sensitive-field schema complete (hash columns and text types).");
    process.exit(0);
  }

  const gaps = [
    ...missingHashes.map((c) => `missing hash: ${c}`),
    ...notText.map((c) => `not text: ${c}`),
  ];
  console.log(
    `Applying sensitive-field encryption schema migration (${gaps.join("; ")})…`,
  );
  const statements = loadStatements();
  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  ({ missingHashes, notText } = await listSchemaGaps());
  if (missingHashes.length > 0 || notText.length > 0) {
    console.error(
      "Migration finished but schema gaps remain:",
      [...missingHashes, ...notText].join(", "),
    );
    process.exit(1);
  }

  console.log(
    `Schema ready (${statements.length} statements). Next: npm run migrate:encrypt-sensitive`,
  );
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
