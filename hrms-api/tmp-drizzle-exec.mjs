import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const db = drizzle({ client });
const result = await db.execute(sql`SELECT column_name::text AS column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name IN ('middle_name','onboarding_status','onboarding_submitted_at')`);
console.log("typeof", typeof result, "isArray", Array.isArray(result), "ctor", result?.constructor?.name);
console.log("keys", result && typeof result === "object" ? Object.keys(result) : null);
console.log("json", JSON.stringify(result).slice(0, 800));
try {
  const mapped = result.map((r) => r.column_name);
  console.log("map ok", mapped);
} catch (e) {
  console.error("map failed", e.message, e.stack);
}
await client.end();
