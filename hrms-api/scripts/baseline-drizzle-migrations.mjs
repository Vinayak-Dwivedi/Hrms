#!/usr/bin/env node
/**
 * Baseline drizzle.__drizzle_migrations for databases created outside drizzle-kit
 * (e.g. hrms_dev.sql import + manual SQL). Fingerprints each migration folder and
 * inserts journal rows only when the schema already reflects that migration.
 *
 * Usage:
 *   node scripts/baseline-drizzle-migrations.mjs          # diagnose + baseline
 *   node scripts/baseline-drizzle-migrations.mjs --dry-run  # diagnose only
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = join(__dirname, "..", "drizzle");
const DRY_RUN = process.argv.includes("--dry-run");

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

/** @type {Record<string, (s: import('postgres').Sql) => Promise<boolean>>} */
const FINGERPRINTS = {
  hrms_init_clean: async (db) => {
    const [row] = await db`
      SELECT
        EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_type_enum') AS has_enum,
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'employees'
        ) AS has_employees
    `;
    return row.has_enum && row.has_employees;
  },
  clean_millenium_guard: async (db) => {
    const [row] = await db`
      SELECT NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
      ) AS orgs_dropped
    `;
    return row.orgs_dropped;
  },
  holidays: async (db) => {
    const [row] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'holidays'
      ) AS has_holidays
    `;
    return row.has_holidays;
  },
  rbac: async (db) => {
    const [row] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'permissions'
          AND column_name = 'code'
      ) AS has_rbac
    `;
    return row.has_rbac;
  },
  employee_middle_name: async (db) => {
    const [row] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
          AND column_name = 'middle_name'
      ) AS has_middle_name
    `;
    return row.has_middle_name;
  },
  rbac_legacy_repair: async (db) => FINGERPRINTS.rbac(db),
  employee_onboarding: async (db) => {
    const [row] = await db`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
          AND column_name = 'onboarding_token'
      ) AS has_token
    `;
    return row.has_token;
  },
  onboarding_phase2: async (db) => {
    const [row] = await db`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'employee_academic_details'
        ) AS has_academic,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'employees'
            AND column_name = 'onboarding_status'
        ) AS has_status
    `;
    return row.has_academic || row.has_status;
  },
  onboarding_phase3: async (db) => {
    const [row] = await db`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'audit_logs'
        ) AS has_audit,
        EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'onboarding_status_enum' AND e.enumlabel = 'PENDING'
        ) AS has_phase3_enum
    `;
    return row.has_audit || row.has_phase3_enum;
  },
};

function resolveFingerprintKey(folderName) {
  if (folderName.includes("hrms-init-clean")) return "hrms_init_clean";
  if (folderName.includes("clean_millenium_guard")) return "clean_millenium_guard";
  if (folderName.includes("holidays")) return "holidays";
  if (folderName.includes("rbac_legacy_repair")) return "rbac_legacy_repair";
  if (folderName.includes("employee_middle_name")) return "employee_middle_name";
  if (folderName.includes("employee_onboarding")) return "employee_onboarding";
  if (folderName.includes("onboarding_phase2")) return "onboarding_phase2";
  if (folderName.includes("onboarding_phase3")) return "onboarding_phase3";
  if (folderName.includes("rbac")) return "rbac";
  return null;
}

function migrationCreatedAt(folderName) {
  const prefix = folderName.split("_")[0];
  const n = Number(prefix);
  if (!Number.isFinite(n)) {
    throw new Error(`Cannot parse migration timestamp from folder: ${folderName}`);
  }
  return n;
}

function migrationHash(migrationSqlPath) {
  const migrationSql = readFileSync(migrationSqlPath, "utf8");
  return createHash("sha256").update(migrationSql).digest("hex");
}

function listMigrationFolders() {
  return readdirSync(DRIZZLE_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+_/.test(e.name))
    .map((e) => e.name)
    .sort();
}

async function ensureMigrationsTable() {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
  await sql`
    ALTER TABLE drizzle.__drizzle_migrations
    ADD COLUMN IF NOT EXISTS name text
  `;
  await sql`
    ALTER TABLE drizzle.__drizzle_migrations
    ADD COLUMN IF NOT EXISTS applied_at timestamptz
  `;
}

async function printDiagnostics() {
  console.log("\n=== Database fingerprint diagnostics ===\n");
  const [journal] = await sql`
    SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations
  `.catch(() => [{ count: 0 }]);

  console.log(`Journal rows in drizzle.__drizzle_migrations: ${journal?.count ?? 0}`);

  const checks = [
    ["has_init (action_type_enum)", FINGERPRINTS.hrms_init_clean],
    ["orgs_dropped (millenium guard)", FINGERPRINTS.clean_millenium_guard],
    ["has_holidays", FINGERPRINTS.holidays],
    ["has_rbac (permissions.code)", FINGERPRINTS.rbac],
    ["has_middle_name", FINGERPRINTS.employee_middle_name],
    ["has_onboarding_token", FINGERPRINTS.employee_onboarding],
    ["has_phase2 (academic or onboarding_status)", FINGERPRINTS.onboarding_phase2],
    ["has_phase3 (audit_logs or PENDING enum)", FINGERPRINTS.onboarding_phase3],
  ];

  for (const [label, fn] of checks) {
    const ok = await fn(sql);
    console.log(`  ${ok ? "YES" : "no "}  ${label}`);
  }
  console.log("");
}

async function main() {
  await ensureMigrationsTable();
  await printDiagnostics();

  const existing = await sql`
    SELECT hash, created_at::text AS created_at, name
    FROM drizzle.__drizzle_migrations
  `;
  const existingKeys = new Set(
    existing.map((r) => `${r.created_at}:${r.hash}`),
  );
  const existingCreatedAt = new Set(existing.map((r) => String(r.created_at)));
  const existingNames = new Set(
    existing.map((r) => r.name).filter(Boolean),
  );

  const folders = listMigrationFolders();
  const baselined = [];
  const pending = [];
  const skipped = [];

  for (const folder of folders) {
    const key = resolveFingerprintKey(folder);
    if (!key || !FINGERPRINTS[key]) {
      skipped.push({ folder, reason: "no fingerprint rule" });
      continue;
    }

    const applied = await FINGERPRINTS[key](sql);
    const createdAt = migrationCreatedAt(folder);
    const migrationPath = join(DRIZZLE_DIR, folder, "migration.sql");
    const hash = migrationHash(migrationPath);
    const recordKey = `${createdAt}:${hash}`;

    if (!applied) {
      pending.push({ folder, key });
      continue;
    }

    if (
      existingNames.has(folder) ||
      existingCreatedAt.has(String(createdAt)) ||
      existingKeys.has(recordKey)
    ) {
      skipped.push({ folder, reason: "already in journal" });
      continue;
    }

    if (DRY_RUN) {
      baselined.push({ folder, key, createdAt, hash, dryRun: true });
      continue;
    }

    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name, applied_at)
      VALUES (${hash}, ${createdAt}, ${folder}, NOW())
    `;
    baselined.push({ folder, key, createdAt, hash });
  }

  console.log("=== Baseline report ===\n");
  if (baselined.length === 0) {
    console.log("Baselined: (none)");
  } else {
    console.log("Baselined:");
    for (const row of baselined) {
      const tag = row.dryRun ? " [dry-run]" : "";
      console.log(`  + ${row.folder} (${row.key})${tag}`);
    }
  }

  if (pending.length > 0) {
    console.log("\nPending (will run on npm run db:migrate):");
    for (const row of pending) {
      console.log(`  - ${row.folder} (${row.key})`);
    }
  }

  if (skipped.length > 0) {
    console.log("\nSkipped:");
    for (const row of skipped) {
      console.log(`  ~ ${row.folder}: ${row.reason}`);
    }
  }

  if (DRY_RUN) {
    console.log("\nDry run only — no journal rows inserted.");
  } else if (baselined.length > 0) {
    console.log("\nDone. Run: npm run db:migrate");
  } else {
    console.log("\nNothing to baseline. Run: npm run db:migrate");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end());
