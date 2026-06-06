import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { employees } from "./src/db/schema/hrms.ts";
for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const db = drizzle({ client });
try {
  const rows = await db.select().from(employees).limit(1);
  console.log("crud-style select ok", rows.length);
} catch (e) {
  console.error("crud select FAIL", e.message);
  if (e.cause) console.error("cause", e.cause.message);
}
await client.end();
