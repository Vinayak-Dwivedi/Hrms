#!/usr/bin/env node
/**
 * Drop org_hierarchy_grades and grade_id from structure (levels = grades).
 * Usage: node scripts/apply-org-hierarchy-merge-level-grade.mjs
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
  "20260611110000_org_hierarchy_merge_level_grade",
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
  console.log("Applying org hierarchy level/grade merge migration…");
  for (const statement of loadStatements()) {
    try {
      await sql.unsafe(statement);
    } catch (e) {
      if (/does not exist|already exists|duplicate/i.test(e.message ?? "")) continue;
      throw e;
    }
  }
  console.log("Level/grade merge migration complete.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
