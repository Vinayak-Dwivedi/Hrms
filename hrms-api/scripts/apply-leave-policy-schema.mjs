#!/usr/bin/env node
/**
 * Apply leave-policy schema migrations when missing:
 *   - drizzle/20260609100000_leave_types_extend/migration.sql
 *   - drizzle/20260610100000_leave_policies/migration.sql
 *
 * Safe to re-run — SQL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  {
    tag: "20260609100000_leave_types_extend",
    createdAt: 1781087400000,
    isApplied: async (db) => {
      const [row] = await db`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'leave_types'
            AND column_name = 'color'
        ) AS ready
      `;
      return row?.ready === true;
    },
  },
  {
    tag: "20260610100000_leave_policies",
    createdAt: 1781091000000,
    isApplied: async (db) => {
      const [row] = await db`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'leave_policies'
        ) AS ready
      `;
      return row?.ready === true;
    },
  },
];

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

function migrationFile(tag) {
  return join(__dirname, "..", "drizzle", tag, "migration.sql");
}

function migrationHash(tag) {
  return createHash("sha256")
    .update(readFileSync(migrationFile(tag), "utf8"))
    .digest("hex");
}

async function recordMigration(tag, createdAt) {
  const hash = migrationHash(tag);
  const [existing] = await sql`
    SELECT id
    FROM drizzle.__drizzle_migrations
    WHERE name = ${tag}
       OR (hash = ${hash} AND created_at = ${createdAt})
    LIMIT 1
  `;
  if (existing) return;

  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name, applied_at)
    VALUES (${hash}, ${createdAt}, ${tag}, NOW())
  `;
}

async function applyMigration(tag) {
  const file = migrationFile(tag);
  const body = readFileSync(file, "utf8");
  console.log(`Applying ${tag}…`);
  await sql.unsafe(body);
}

try {
  for (const mig of MIGRATIONS) {
    if (await mig.isApplied(sql)) {
      console.log(`${mig.tag} already applied.`);
      await recordMigration(mig.tag, mig.createdAt);
      continue;
    }

    await applyMigration(mig.tag);

    if (!(await mig.isApplied(sql))) {
      console.error(`${mig.tag} finished but schema check still failed.`);
      process.exit(1);
    }

    await recordMigration(mig.tag, mig.createdAt);
    console.log(`${mig.tag} ready.`);
  }

  console.log("Leave policy schema migrations complete.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
