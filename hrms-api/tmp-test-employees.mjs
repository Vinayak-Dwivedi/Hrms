import { readFileSync } from "node:fs";
import { resolve } from "node:path";
for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
import { sql } from "drizzle-orm";
import { db } from "./src/db/runtime.ts";
import { getEmployeeColumnSupport, clearEmployeeColumnSupportCache } from "./src/lib/employee-schema-compat.ts";
import * as repo from "./src/modules/hr-onboarding/repositories/employee-admin.repository.ts";
clearEmployeeColumnSupportCache();
const raw = await db.execute(sql`SELECT column_name::text AS column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name IN ('middle_name','onboarding_status','onboarding_submitted_at')`);
console.log("raw execute type", typeof raw, Array.isArray(raw), raw?.constructor?.name);
console.log("raw sample", JSON.stringify(raw).slice(0, 500));
console.log("has map", typeof raw?.map);
try {
  const support = await getEmployeeColumnSupport();
  console.log("support", support);
  const result = await repo.listEmployeesAdmin({ limit: 5, offset: 0 });
  console.log("list ok total", result.total);
} catch (e) {
  console.error("FAIL", e);
  if (e instanceof Error) console.error(e.stack);
  process.exit(1);
}
