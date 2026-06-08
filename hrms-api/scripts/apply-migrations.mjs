// One-off: apply all drizzle/*/migration.sql idempotently.
// Usage: node scripts/apply-migrations.mjs
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* missing file is OK */
  }
}

loadDotEnv(resolve(process.cwd(), ".env.local"));
loadDotEnv(resolve(process.cwd(), ".env"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { connect_timeout: 10, max: 1 });

try {
  await sql.unsafe("CREATE EXTENSION IF NOT EXISTS citext");
  await sql.unsafe("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  // Only the newer, idempotent (IF NOT EXISTS) org-setup migrations — the
  // initial schema migration is non-idempotent and already applied.
  const MIN_MIGRATION = "20260604000000";
  const dirs = readdirSync("drizzle")
    .filter((d) => /^\d/.test(d) && d >= MIN_MIGRATION)
    .sort();
  for (const dir of dirs) {
    const file = resolve("drizzle", dir, "migration.sql");
    let raw;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const stmts = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    let ok = 0;
    let skip = 0;
    for (const s of stmts) {
      try {
        await sql.unsafe(s);
        ok++;
      } catch (e) {
        if (/already exists|duplicate/i.test(e.message)) skip++;
        else throw e;
      }
    }
    console.log(`${dir}  applied=${ok} skipped=${skip}`);
  }
  console.log("Migrations applied.");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
