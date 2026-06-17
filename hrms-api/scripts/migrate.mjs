#!/usr/bin/env node
/**
 * Custom migration runner — replaces `drizzle-kit migrate`.
 *
 * Why this exists: drizzle-kit 1.0.0-beta.x rejects this project's
 * meta/_journal.json (snapshot/format validation), so `drizzle-kit migrate`
 * can't run. This runner reads the journal directly, applies each migration
 * folder's migration.sql in idx order, and records applied migrations in the
 * same `drizzle.__drizzle_migrations` table drizzle-kit uses — so the two stay
 * compatible and re-runs are idempotent (already-applied tags are skipped).
 *
 * Statement splitting: each migration.sql is run as a single multi-statement
 * call (postgres-js `unsafe`), matching the existing apply-*.mjs scripts. The
 * `--> statement-breakpoint` markers are only meaningful to drizzle-kit, so we
 * strip them and run the file as one batch.
 *
 * Usage: npm run db:migrate   (reads DATABASE_URL from .env)
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = join(__dirname, "..", "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

function readJournal() {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8"));
  const entries = [...(journal.entries ?? [])].sort((a, b) => a.idx - b.idx);
  return entries;
}

function migrationFile(tag) {
  return join(DRIZZLE_DIR, tag, "migration.sql");
}

function hashOf(body) {
  return createHash("sha256").update(body).digest("hex");
}

async function ensureExtensions() {
  // The init migration uses the `citext` type and `gen_random_uuid()`. On a
  // fresh database these extensions don't exist yet (existing envs had them
  // created out-of-band), so ensure them before any migration runs. Both are
  // RDS-trusted and idempotent.
  await sql.unsafe(`
    CREATE EXTENSION IF NOT EXISTS "citext";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);
}

async function ensureTrackingTable() {
  await sql.unsafe(`
    CREATE SCHEMA IF NOT EXISTS "drizzle";
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
    ALTER TABLE "drizzle"."__drizzle_migrations" ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE "drizzle"."__drizzle_migrations" ADD COLUMN IF NOT EXISTS applied_at timestamptz DEFAULT now();
  `);
}

async function appliedTags() {
  const rows = await sql`
    SELECT name, hash FROM "drizzle"."__drizzle_migrations"
  `;
  const byName = new Set();
  const byHash = new Set();
  for (const r of rows) {
    if (r.name) byName.add(r.name);
    if (r.hash) byHash.add(r.hash);
  }
  return { byName, byHash };
}

async function recordApplied(tag, body, when) {
  await sql`
    INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at, name, applied_at)
    VALUES (${hashOf(body)}, ${when ?? null}, ${tag}, NOW())
  `;
}

async function run() {
  await ensureExtensions();
  await ensureTrackingTable();
  const entries = readJournal();
  const { byName, byHash } = await appliedTags();

  let applied = 0;
  let skipped = 0;

  for (const entry of entries) {
    const tag = entry.tag;
    const file = migrationFile(tag);
    if (!existsSync(file)) {
      console.error(`✗ ${tag}: migration.sql not found at ${file}`);
      process.exit(1);
    }
    const body = readFileSync(file, "utf8");

    if (byName.has(tag) || byHash.has(hashOf(body))) {
      skipped++;
      continue;
    }

    // Strip drizzle-kit's breakpoint markers; run the file as one batch.
    const runnable = body.replace(/-->\s*statement-breakpoint/g, "");
    process.stdout.write(`→ applying [${entry.idx}] ${tag} … `);
    try {
      await sql.unsafe(runnable);
    } catch (e) {
      console.log("FAILED");
      console.error(`\n✗ ${tag} failed:\n${e?.message ?? e}`);
      process.exit(1);
    }
    await recordApplied(tag, body, entry.when);
    console.log("ok");
    applied++;
  }

  console.log(
    `\nMigrations complete. applied=${applied} skipped(already-applied)=${skipped} total=${entries.length}`,
  );
}

try {
  await run();
} catch (e) {
  console.error(e?.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
