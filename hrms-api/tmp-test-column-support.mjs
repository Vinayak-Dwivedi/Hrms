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
async function getEmployeeColumnSupport() {
  const result = await db.execute(sql`
    SELECT column_name::text AS column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name IN ('middle_name','onboarding_status','onboarding_submitted_at')
  `);
  const cols = new Set(result.map((r) => r.column_name));
  return {
    middleName: cols.has("middle_name"),
    onboardingStatus: cols.has("onboarding_status"),
    onboardingSubmittedAt: cols.has("onboarding_submitted_at"),
  };
}
const support = await getEmployeeColumnSupport();
console.log("getEmployeeColumnSupport", support);
const count = await db.execute(sql`SELECT count(*)::int AS count FROM employees`);
console.log("count result type", Array.isArray(count), count[0]);
await client.end();
