#!/usr/bin/env node
// Idempotent admin user + linked employee for HRMS full access.
// Usage: node scripts/seed-admin.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch {
    /* missing file is OK */
  }
}

loadDotEnv(resolve(process.cwd(), ".env"));
loadDotEnv(resolve(process.cwd(), ".env.local"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@iotindia.ai";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "12345678";
const ADMIN_NAME = "HR Admin";
const EMP_ID = "IOT-0001";
/** Legacy `user_types` row: slug `admin` (Administrator). */
const ADMIN_USER_TYPE_ID = 1;

const sql = postgres(url, { max: 1, connect_timeout: 10 });

try {
  const email = ADMIN_EMAIL.toLowerCase();
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const now = new Date();
  const passwordPlaceholder = await bcrypt.hash("unused", 4);

  let userId;
  const [existingUser] = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existingUser) {
    userId = existingUser.id;
    await sql`
      UPDATE users
      SET
        name = ${ADMIN_NAME},
        role = 'admin',
        user_type_id = ${ADMIN_USER_TYPE_ID},
        email_verified = true,
        updated_at = ${now}
      WHERE id = ${userId}
    `;
    const [acc] =
      await sql`SELECT id FROM accounts WHERE user_id = ${userId} AND provider_id = 'credential'`;
    if (acc) {
      await sql`UPDATE accounts SET password = ${hash}, updated_at = ${now} WHERE id = ${acc.id}`;
    } else {
      await sql`
        INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hash}, ${now}, ${now})
      `;
    }
  } else {
    userId = randomUUID();
    await sql`
      INSERT INTO users (id, name, email, email_verified, role, user_type_id, created_at, updated_at)
      VALUES (${userId}, ${ADMIN_NAME}, ${email}, true, 'admin', ${ADMIN_USER_TYPE_ID}, ${now}, ${now})
    `;
    await sql`
      INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
      VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hash}, ${now}, ${now})
    `;
  }

  const [existingEmp] =
    await sql`SELECT id FROM employees WHERE lower(work_email::text) = ${email} OR emp_id = ${EMP_ID} LIMIT 1`;

  if (existingEmp) {
    await sql`
      UPDATE employees
      SET
        first_name = 'HR',
        last_name = 'Admin',
        personal_email = ${email},
        work_email = ${email},
        phone = '+919999000099',
        user_id = ${userId},
        employee_status = 'Active',
        updated_at = ${now}
      WHERE id = ${existingEmp.id}
    `;
  } else {
    await sql`
      INSERT INTO employees (
        emp_id, first_name, last_name, personal_email, work_email,
        phone, dob, gender, nationality, joining_date, password_hash, user_id, employee_status
      )
      VALUES (
        ${EMP_ID}, 'HR', 'Admin', ${email}, ${email},
        '+919999000099', '1990-01-01', 'Other', 'Indian', ${now.toISOString().slice(0, 10)},
        ${passwordPlaceholder}, ${userId}, 'Active'
      )
    `;
  }

  const [linked] = await sql`
    UPDATE employees
    SET user_id = ${userId}
    WHERE lower(work_email::text) = ${email}
    RETURNING id, emp_id
  `;

  console.log("");
  console.log("Admin user seeded successfully.");
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
  console.log(`  Role     : admin`);
  console.log(`  Employee : ${linked?.emp_id ?? EMP_ID} (id=${linked?.id ?? "?"})`);
  console.log("");
  console.log("Also run: npm run seed:rbac");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
