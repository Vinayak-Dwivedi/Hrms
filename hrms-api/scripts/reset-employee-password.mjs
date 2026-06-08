#!/usr/bin/env node
// Reset login password for an employee by work email. Prints the new password once.
// Usage: node scripts/reset-employee-password.mjs <work_email> [new_password]

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
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

const email = (process.argv[2] ?? "").toLowerCase().trim();
const newPassword = process.argv[3] ?? "Welcome@12345";

if (!email) {
  console.error("Usage: node scripts/reset-employee-password.mjs <work_email> [new_password]");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const [emp] = await sql`
    SELECT e.id, e.emp_id, e.user_id, e.work_email
    FROM employees e
    WHERE lower(e.work_email::text) = ${email}
    LIMIT 1
  `;
  if (!emp?.user_id) {
    console.error(`No employee with work email ${email} or missing user_id.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  const now = new Date();

  await sql`
    UPDATE accounts
    SET password = ${hash}, updated_at = ${now}
    WHERE user_id = ${emp.user_id} AND provider_id = 'credential'
  `;
  await sql`
    UPDATE employees SET password_hash = ${hash}, updated_at = ${now}
    WHERE id = ${emp.id}
  `;

  console.log("");
  console.log("Password reset successfully.");
  console.log(`  Emp ID     : ${emp.emp_id}`);
  console.log(`  Work email : ${emp.work_email}`);
  console.log(`  Password   : ${newPassword}`);
  console.log("");
  console.log("Use work email + this password on the onboarding sign-in page.");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
