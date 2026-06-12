#!/usr/bin/env node
/**
 * Apply idempotent onboarding-related schema patches not yet on the database.
 * Usage: node scripts/apply-onboarding-pending-migrations.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scripts = [
  "apply-onboarding-phase3-document-rejection.mjs",
  "apply-onboarding-bank-approval-schema.mjs",
];

function runScript(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(__dirname, name)], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code}`));
    });
  });
}

try {
  for (const script of scripts) {
    console.log(`\n==> ${script}`);
    await runScript(script);
  }
  console.log("\nAll onboarding pending migrations applied.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
}
