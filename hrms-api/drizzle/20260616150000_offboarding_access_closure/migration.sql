-- Offboarding Phase 6 — Access Revocation + Final Closure.
-- Per-case access-system revocation checklist. Closure itself reuses the
-- existing offboarding_case_status_enum 'Closed' value (no new status needed).
-- New audit enum values are only ADDED here (same-transaction rule).

-- 1. New enum types (idempotent).
DO $$ BEGIN
  CREATE TYPE "access_system_enum" AS ENUM (
    'HRMSLogin', 'Email', 'VPN', 'CRM', 'ERP', 'AttendanceSystem', 'BankingApplication'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "access_status_enum" AS ENUM ('Active', 'Disabled');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- 2. Audit enum values.
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_ACCESS_REVOKED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_CASE_CLOSED';--> statement-breakpoint

-- 3. Table.
CREATE TABLE IF NOT EXISTS "access_revocations" (
  "id" serial PRIMARY KEY NOT NULL,
  "case_id" integer NOT NULL REFERENCES "offboarding_cases"("id") ON DELETE CASCADE,
  "system" "access_system_enum" NOT NULL,
  "status" "access_status_enum" NOT NULL DEFAULT 'Active',
  "is_auto" boolean NOT NULL DEFAULT false,
  "revoked_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "access_revocations_case_system_uq" ON "access_revocations" ("case_id", "system");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_revocations_case" ON "access_revocations" ("case_id");
