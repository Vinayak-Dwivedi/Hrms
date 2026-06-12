#!/usr/bin/env node
// Diagnose an onboarding invitation token.
// Usage: node scripts/diagnose-onboarding-token.mjs <raw_token> [api_base]

import { createHash } from "node:crypto";
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

const rawToken = (process.argv[2] ?? "").trim();
const apiBase = process.argv[3] ?? "http://localhost:4000";

if (!rawToken) {
  console.error("Usage: node scripts/diagnose-onboarding-token.mjs <raw_token> [api_base]");
  process.exit(1);
}

function hashOnboardingToken(token) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

const tokenHash = hashOnboardingToken(rawToken);
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const [emp] = await sql`
    SELECT
      e.id,
      e.emp_id,
      e.work_email,
      e.personal_email,
      e.employee_status,
      e.onboarding_token,
      e.onboarding_token_expiry,
      e.onboarding_token_used,
      e.onboarding_status,
      e.onboarding_completed_at,
      e.user_id,
      a.password IS NOT NULL AS has_password
    FROM employees e
    LEFT JOIN accounts a ON a.user_id = e.user_id AND a.provider_id = 'credential'
    WHERE e.onboarding_token = ${tokenHash}
       OR lower(e.onboarding_token::text) = ${rawToken.toLowerCase()}
    LIMIT 1
  `;

  console.log("Token hash:", tokenHash);
  if (!emp) {
    console.log("No employee row matches this token.");
    process.exit(1);
  }

  const now = new Date();
  const expiry = emp.onboarding_token_expiry ? new Date(emp.onboarding_token_expiry) : null;
  const issues = [];
  if (emp.employee_status !== "Active") issues.push(`employee_status=${emp.employee_status}`);
  if (emp.onboarding_token_used) issues.push("token already used");
  if (emp.onboarding_completed_at) issues.push("onboarding completed");
  if (expiry && expiry < now) issues.push(`expired at ${expiry.toISOString()}`);
  if (!emp.user_id) issues.push("missing user_id");
  if (!emp.has_password) issues.push("missing credential password");
  if (!emp.work_email) issues.push("missing work_email");

  console.log(JSON.stringify(emp, null, 2));
  console.log("Issues:", issues.length ? issues.join(", ") : "none");

  const validateRes = await fetch(
    `${apiBase}/api/onboarding/validate?${new URLSearchParams({ token: rawToken })}`,
  );
  const validateBody = await validateRes.json().catch(() => ({}));
  console.log(`GET /api/onboarding/validate -> ${validateRes.status}`);
  console.log(JSON.stringify(validateBody, null, 2));
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
