#!/usr/bin/env node
/**
 * Apply drizzle/20260609100000_personal_email_verification/migration.sql when
 * employees.personal_email_verified or email_verification_otps is missing.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_TAG = "20260609100000_personal_email_verification";
const MIGRATION_FILE = join(__dirname, "..", "drizzle", MIGRATION_TAG, "migration.sql");

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

async function schemaReady() {
  const [col] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'employees'
        AND column_name = 'personal_email_verified'
    ) AS has_column
  `;
  const [table] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'email_verification_otps'
    ) AS has_table
  `;
  return col?.has_column === true && table?.has_table === true;
}

function loadStatements() {
  const raw = readFileSync(MIGRATION_FILE, "utf8");
  return raw
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function migrationHash() {
  return createHash("sha256").update(readFileSync(MIGRATION_FILE, "utf8")).digest("hex");
}

async function recordMigration() {
  const hash = migrationHash();
  const createdAt = 1781085600000;
  const [existing] = await sql`
    SELECT id
    FROM drizzle.__drizzle_migrations
    WHERE name = ${MIGRATION_TAG}
       OR (hash = ${hash} AND created_at = ${createdAt})
    LIMIT 1
  `;
  if (existing) return;

  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name, applied_at)
    VALUES (${hash}, ${createdAt}, ${MIGRATION_TAG}, NOW())
  `;
}

try {
  if (await schemaReady()) {
    console.log("Personal email verification schema already present.");
    await recordMigration();
    process.exit(0);
  }

  console.log("Applying personal email verification schema migration…");
  const statements = loadStatements();
  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  if (!(await schemaReady())) {
    console.error(
      "Migration finished but personal_email_verified or email_verification_otps is still missing.",
    );
    process.exit(1);
  }

  await recordMigration();
  console.log(`Schema ready (${statements.length} statements).`);
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
