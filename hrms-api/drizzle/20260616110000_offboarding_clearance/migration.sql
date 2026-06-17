-- Offboarding Phase 2 — Clearance Workflow.
-- Adds per-team clearance templates (admin config, seeded with defaults) and the
-- runtime clearance_tasks snapshotted onto each offboarding case. New audit enum
-- values are only ADDED here, never USED in this file (same-transaction rule).

-- 1. New enum types (idempotent).
DO $$ BEGIN
  CREATE TYPE "clearance_team_enum" AS ENUM (
    'ReportingManager', 'IT', 'Admin', 'Finance', 'HR', 'Operations'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "clearance_task_status_enum" AS ENUM ('Pending', 'Completed', 'NA');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- 2. Audit enum values.
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_CLEARANCE_UPDATED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_CLEARANCES_COMPLETE';--> statement-breakpoint

-- 3. Tables.
CREATE TABLE IF NOT EXISTS "clearance_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "team" "clearance_team_enum" NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "tasks" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "clearance_tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "case_id" integer NOT NULL REFERENCES "offboarding_cases"("id") ON DELETE CASCADE,
  "team" "clearance_team_enum" NOT NULL,
  "label" varchar(200) NOT NULL,
  "status" "clearance_task_status_enum" NOT NULL DEFAULT 'Pending',
  "sort_order" integer NOT NULL DEFAULT 0,
  "completed_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "completed_at" timestamptz,
  "remarks" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_clearance_tasks_case" ON "clearance_tasks" ("case_id");--> statement-breakpoint

-- 4. Seed default templates (idempotent on the unique team).
INSERT INTO "clearance_templates" ("team", "name", "tasks") VALUES
  ('ReportingManager', 'Reporting Manager Clearance', '["Knowledge Transfer Completed","Project Handover","Document Handover","Client Handover"]'::jsonb),
  ('IT', 'IT Clearance', '["Laptop Return","Charger Return","Mouse Return","Headset Return","Access Revocation","Email Deactivation"]'::jsonb),
  ('Admin', 'Admin Clearance', '["ID Card Return","Access Card Return","Parking Pass Return","Locker Clearance"]'::jsonb),
  ('Finance', 'Finance Clearance', '["Loan Recovery","Advance Recovery","Salary Recovery","Expense Settlement"]'::jsonb),
  ('HR', 'HR Clearance', '["Exit Interview","Policy Acceptance","Final Document"]'::jsonb),
  ('Operations', 'Operations Clearance', '["Process Signoff","Shift Signoff","Resource Signoff"]'::jsonb)
ON CONFLICT ("team") DO NOTHING;
