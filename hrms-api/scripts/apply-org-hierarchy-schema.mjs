#!/usr/bin/env node
/**
 * Apply drizzle/20260611100000_org_hierarchy/migration.sql when org hierarchy
 * tables are missing (safe to re-run — uses IF NOT EXISTS).
 *
 * Usage: node scripts/apply-org-hierarchy-schema.mjs
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_TAG = "20260611100000_org_hierarchy";
const MIGRATION_FILE = join(
  __dirname,
  "..",
  "drizzle",
  MIGRATION_TAG,
  "migration.sql",
);
const MIGRATION_CREATED_AT = 1781179200000;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

async function hasOrgHierarchySchema() {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'org_hierarchy_levels'
    ) AS ready
  `;
  return row?.ready === true;
}

function loadStatements() {
  const raw = readFileSync(MIGRATION_FILE, "utf8");
  return raw
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function migrationHash() {
  return createHash("sha256")
    .update(readFileSync(MIGRATION_FILE, "utf8"))
    .digest("hex");
}

async function ensureMigrationsTable() {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
  await sql`
    ALTER TABLE drizzle.__drizzle_migrations
    ADD COLUMN IF NOT EXISTS name text
  `;
  await sql`
    ALTER TABLE drizzle.__drizzle_migrations
    ADD COLUMN IF NOT EXISTS applied_at timestamptz
  `;
}

async function recordMigration() {
  await ensureMigrationsTable();
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
  if (await hasOrgHierarchySchema()) {
    console.log("Org hierarchy schema already present.");
    await recordMigration();
    process.exit(0);
  }

  console.log("Applying org hierarchy schema migration…");
  const statements = loadStatements();
  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
    } catch (e) {
      if (/already exists|duplicate/i.test(e.message ?? "")) continue;
      throw e;
    }
  }

  if (!(await hasOrgHierarchySchema())) {
    console.error(
      "Migration finished but org_hierarchy_levels table is still missing.",
    );
    process.exit(1);
  }

  await recordMigration();
  console.log(`Org hierarchy schema ready (${statements.length} statements).`);
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
