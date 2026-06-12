#!/usr/bin/env node
// Idempotent: creates locations table if missing (matches drizzle/20260604000000_locations).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadDotEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch {}
}

loadDotEnv(resolve(process.cwd(), ".env"));

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id serial PRIMARY KEY NOT NULL,
      name varchar(150) NOT NULL,
      code varchar(20) NOT NULL,
      address text,
      city varchar(120) NOT NULL,
      state varchar(120) NOT NULL,
      country varchar(120) NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT locations_code_unique UNIQUE (code)
    )
  `;
  await sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS address text`;

  const [row] = await sql`
    SELECT to_regclass('public.locations')::text AS table_name
  `;
  console.log("locations table:", row?.table_name ?? "missing");
  if (!row?.table_name) {
    process.exit(1);
  }
  console.log("OK: locations schema is ready.");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
