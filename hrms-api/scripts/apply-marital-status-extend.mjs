#!/usr/bin/env node
/**
 * Extend marital_status_enum with Divorced, Widowed, Separated, Prefer Not to Say.
 * Usage: node scripts/apply-marital-status-extend.mjs
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
  "20260617100000_marital_status_extend",
  "migration.sql",
);

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

function loadStatements() {
  return readFileSync(MIGRATION_FILE, "utf8")
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

try {
  console.log("Applying extended marital status enum values…");
  await sql`SET client_min_messages TO WARNING`;
  for (const statement of loadStatements()) {
    try {
      await sql.unsafe(statement);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (/already exists|duplicate/i.test(msg)) {
        console.log(`  (skip) ${msg}`);
        continue;
      }
      throw e;
    }
  }
  console.log("Marital status enum extension applied.");
} finally {
  await sql.end();
}
