#!/usr/bin/env node
/**
 * Add org_hierarchy_structure_id to employees.
 * Usage: node scripts/apply-employee-org-hierarchy-structure.mjs
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
  "20260611120000_employee_org_hierarchy_structure",
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
  console.log("Applying employee org hierarchy structure column…");
  await sql`SET client_min_messages TO WARNING`;
  for (const statement of loadStatements()) {
    try {
      await sql.unsafe(statement);
    } catch (e) {
      if (/already exists|duplicate/i.test(e.message ?? "")) continue;
      throw e;
    }
  }
  console.log("Employee org hierarchy structure column ready.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
