#!/usr/bin/env node
// Verify POST /api/auth/login for work emails.
// Usage: node scripts/verify-login-api.mjs [baseUrl]

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

const baseUrl = process.argv[2] ?? "http://10.24.24.248:4000";
const testPassword = "Welcome@12345";
const emails = ["nyqozakyha@mailinator.com", "lykozus@mailinator.com"];

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function ensurePassword(workEmail) {
  const [emp] = await sql`
    SELECT e.id, e.user_id
    FROM employees e
    WHERE lower(e.work_email::text) = ${workEmail}
    LIMIT 1
  `;
  if (!emp?.user_id) throw new Error(`No user for ${workEmail}`);
  const hash = await bcrypt.hash(testPassword, 10);
  const now = new Date();
  await sql`
    UPDATE accounts
    SET password = ${hash}, updated_at = ${now}
    WHERE user_id = ${emp.user_id} AND provider_id = 'credential'
  `;
}

async function login(workEmail) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId: workEmail, password: testPassword }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

try {
  for (const email of emails) {
    await ensurePassword(email);
    const personalOnly = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: email === "nyqozakyha@mailinator.com"
          ? "wonov@mailinator.com"
          : "lilivabuj@mailinator.com",
        password: testPassword,
      }),
    });
    const personalBody = await personalOnly.json().catch(() => ({}));
    const ok = await login(email);
    console.log(email);
    console.log(
      `  personal email -> ${personalOnly.status} ${personalBody?.error?.code ?? ""}`,
    );
    console.log(
      `  work email     -> ${ok.status} ${ok.body?.user?.email ?? ok.body?.error?.code ?? ""}`,
    );
    if (ok.status !== 200) {
      process.exitCode = 1;
    }
  }
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
