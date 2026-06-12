#!/usr/bin/env node
/**
 * Add onboarding bank approval columns to employees.
 * Usage: node scripts/apply-onboarding-bank-approval-schema.mjs
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
  "20260612100000_onboarding_bank_approval",
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
  console.log("Applying onboarding bank approval columns…");
  await sql`SET client_min_messages TO WARNING`;
  for (const statement of loadStatements()) {
    try {
      await sql.unsafe(statement);
    } catch (e) {
      if (/already exists|duplicate/i.test(e.message ?? "")) continue;
      throw e;
    }
  }
  console.log("Onboarding bank approval columns ready.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
