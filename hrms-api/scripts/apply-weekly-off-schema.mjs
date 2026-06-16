#!/usr/bin/env node
/**
 * Apply weekly-off schema migration when missing:
 *   - drizzle/20260611120000_weekly_off_configs/migration.sql
 *
 * Safe to re-run — SQL uses IF NOT EXISTS.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATION_TAG = "20260611120000_weekly_off_configs";
const MIGRATION_CREATED_AT = 1781182800000;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

function migrationFile() {
  return join(__dirname, "..", "drizzle", MIGRATION_TAG, "migration.sql");
}

function migrationHash() {
  return createHash("sha256")
    .update(readFileSync(migrationFile(), "utf8"))
    .digest("hex");
}

async function isApplied() {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'weekly_off_configs'
    ) AS ready
  `;
  return row?.ready === true;
}

async function recordMigration() {
  const hash = migrationHash();
  const [existing] = await sql`
    SELECT id
    FROM drizzle.__drizzle_migrations
    WHERE name = ${MIGRATION_TAG}
       OR (hash = ${hash} AND created_at = ${MIGRATION_CREATED_AT})
    LIMIT 1
  `;
  if (existing) return;

  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name, applied_at)
    VALUES (${hash}, ${MIGRATION_CREATED_AT}, ${MIGRATION_TAG}, NOW())
  `;
}

try {
  if (await isApplied()) {
    console.log(`${MIGRATION_TAG} already applied.`);
    await recordMigration();
  } else {
    const body = readFileSync(migrationFile(), "utf8");
    console.log(`Applying ${MIGRATION_TAG}…`);
    await sql.unsafe(body);

    if (!(await isApplied())) {
      console.error(`${MIGRATION_TAG} finished but schema check still failed.`);
      process.exit(1);
    }

    await recordMigration();
    console.log(`${MIGRATION_TAG} ready.`);
  }

  console.log("Weekly-off schema migration complete.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
