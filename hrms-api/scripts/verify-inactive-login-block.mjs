#!/usr/bin/env node
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

const apiBase = process.argv[2] ?? "http://localhost:4000";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const [inactive] = await sql`
    SELECT e.work_email, e.emp_id, e.employee_status
    FROM employees e
    WHERE e.employee_status <> 'Active'
      AND e.user_id IS NOT NULL
    LIMIT 1
  `;
  if (!inactive) {
    console.log("No inactive employee with a user account found to test.");
    process.exit(0);
  }
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginId: inactive.work_email,
      password: "wrong-password-on-purpose",
    }),
  });
  const wrongPass = await res.json().catch(() => ({}));
  console.log("Inactive employee:", inactive.work_email, inactive.employee_status);
  console.log("Wrong password ->", res.status, wrongPass?.error?.code);

  const res2 = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginId: inactive.work_email,
      password: "Welcome@12345",
    }),
  });
  const body2 = await res2.json().catch(() => ({}));
  console.log("Known password attempt ->", res2.status, body2?.error?.code ?? "OK");
  if (res2.status === 403 && body2?.error?.code === "ACCOUNT_INACTIVE") {
    console.log("OK: inactive login blocked.");
  } else if (res2.status === 401) {
    console.log("Password may differ; set with reset-employee-password.mjs then retry.");
  }
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
