import { readFileSync } from "node:fs";
import { resolve } from "node:path";
for (const line of readFileSync(resolve(".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
const { getEmployeeColumnSupport, clearEmployeeColumnSupportCache } = await import("./src/lib/employee-schema-compat.ts");
const repo = await import("./src/modules/hr-onboarding/repositories/employee-admin.repository.ts");
clearEmployeeColumnSupportCache();
try {
  const support = await getEmployeeColumnSupport();
  console.log("support", support);
  const result = await repo.listEmployeesAdmin({ limit: 5, offset: 0 });
  console.log("list ok total", result.total, "rows", result.rows.length);
} catch (e) {
  console.error("ERROR", e);
  if (e instanceof Error) console.error(e.stack);
  process.exit(1);
}
