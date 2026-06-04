// Re-seeds the auth users + accounts tables with bcrypt password hashes,
// keyed to the work_email of each row in employees so the
// employees.user_id FK is set automatically by seed-employees-link.
//
// Usage:
//   node scripts/seed-users.mjs
//
// Reads DATABASE_URL from env, .env, or .env.local. Safe to re-run — it
// upserts by email and re-links the FK.

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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
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

const EMPLOYEE_PASSWORD = process.env.SEED_EMPLOYEE_PASSWORD ?? "Employee@12345!";
const MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD ?? "Manager@12345!";

const sql = postgres(url, { max: 1, connect_timeout: 10 });

// Emails match employees.work_email so the FK link is automatic.
const seedUsers = [
  { name: "Rahul Mehta",   email: "rahul@ileads.example",  role: "user",    password: EMPLOYEE_PASSWORD },
  { name: "Aarav Singh",   email: "aarav@ileads.example",  role: "user",    password: EMPLOYEE_PASSWORD },
  { name: "Kavya Bhatt",   email: "kavya@ileads.example",  role: "user",    password: EMPLOYEE_PASSWORD },
  { name: "Rohan Thapa",   email: "rohan@ileads.example",  role: "user",    password: EMPLOYEE_PASSWORD },
  { name: "Ishaan Pant",   email: "ishaan@ileads.example", role: "user",    password: EMPLOYEE_PASSWORD },
  { name: "Vikram Negi",   email: "vikram@ileads.example", role: "user",    password: EMPLOYEE_PASSWORD },
  { name: "Priya Sharma",  email: "priya@ileads.example",  role: "manager", password: MANAGER_PASSWORD },
  { name: "Neha Kapoor",   email: "neha@ileads.example",   role: "hr",      password: EMPLOYEE_PASSWORD },
];

try {
  // Wipe legacy demo users from the old domain so they don't linger as orphans.
  const legacyEmails = [
    "rohit.mehta@ileads.example",
    "rohan.thapa@ileads.example",
    "kavya.bhatt@ileads.example",
    "aarav.singh@ileads.example",
    "priya.sharma@ileads.example",
  ];
  await sql`DELETE FROM accounts WHERE user_id IN (SELECT id FROM users WHERE email = ANY(${legacyEmails}))`;
  await sql`DELETE FROM users WHERE email = ANY(${legacyEmails})`;

  let created = 0;
  let updated = 0;
  for (const u of seedUsers) {
    const email = u.email.toLowerCase();
    const hash = await bcrypt.hash(u.password, 10);
    const now = new Date();
    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;

    if (existing) {
      await sql`
        UPDATE users
        SET name = ${u.name}, role = ${u.role}, email_verified = true, updated_at = ${now}
        WHERE id = ${existing.id}
      `;
      const [acc] = await sql`SELECT id FROM accounts WHERE user_id = ${existing.id} AND provider_id = 'credential'`;
      if (acc) {
        await sql`UPDATE accounts SET password = ${hash}, updated_at = ${now} WHERE id = ${acc.id}`;
      } else {
        await sql`
          INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
          VALUES (${randomUUID()}, ${existing.id}, 'credential', ${existing.id}, ${hash}, ${now}, ${now})
        `;
      }
      updated++;
    } else {
      const userId = randomUUID();
      await sql`
        INSERT INTO users (id, name, email, email_verified, role, created_at, updated_at)
        VALUES (${userId}, ${u.name}, ${email}, true, ${u.role}, ${now}, ${now})
      `;
      await sql`
        INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hash}, ${now}, ${now})
      `;
      created++;
    }
  }

  // Link employees.user_id by work_email match (case-insensitive).
  const linked = await sql`
    UPDATE employees e
    SET user_id = u.id
    FROM users u
    WHERE e.user_id IS DISTINCT FROM u.id
      AND lower(e.work_email::text) = u.email
    RETURNING e.id, e.first_name, e.user_id
  `;

  console.log("");
  console.log(`Users    : ${created} created, ${updated} updated`);
  console.log(`Linked   : ${linked.length} employees ↔ users`);
  console.log("");
  console.log("── Credentials ──────────────────────────────────────────────");
  console.log("  Login : POST /api/auth/login   { email, password }");
  console.log("");
  for (const u of seedUsers) {
    const tag = u.role === "manager" ? "MANAGER " : u.role === "hr" ? "HR      " : "EMPLOYEE";
    console.log(`  ${tag}  ${u.name.padEnd(13)} ${u.email.padEnd(28)} ${u.password}`);
  }

  console.log("─────────────────────────────────────────────────────────────");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
