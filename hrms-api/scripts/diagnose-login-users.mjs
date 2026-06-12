#!/usr/bin/env node
// Diagnose login readiness for specific employee emails.
// Usage: node scripts/diagnose-login-users.mjs [email ...]

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

const emails = (process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["nyqozakyha@mailinator.com", "lykozus@mailinator.com"]
).map((e) => e.toLowerCase().trim());

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const rows = await sql`
    SELECT
      e.emp_id,
      e.work_email,
      e.personal_email,
      u.email AS users_email,
      a.password IS NOT NULL AS has_password,
      e.user_id IS NOT NULL AS linked,
      u.id AS user_id
    FROM employees e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN accounts a ON a.user_id = u.id AND a.provider_id = 'credential'
    WHERE lower(e.work_email::text) = ANY(${emails})
       OR lower(e.personal_email::text) = ANY(${emails})
       OR lower(u.email) = ANY(${emails})
    ORDER BY e.emp_id
  `;

  if (rows.length === 0) {
    console.log("No employees matched:", emails.join(", "));
    process.exit(1);
  }

  console.log(JSON.stringify(rows, null, 2));
  for (const row of rows) {
    const issues = [];
    if (!row.linked) issues.push("missing user_id link");
    if (!row.has_password) issues.push("missing credential password");
    if (
      row.users_email &&
      row.work_email &&
      row.users_email.toLowerCase() !== row.work_email.toLowerCase()
    ) {
      issues.push("users.email drift from work_email");
    }
    console.log(
      `${row.emp_id}: login with work email ${row.work_email} or emp id; issues: ${
        issues.length ? issues.join(", ") : "none"
      }`,
    );
  }
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
