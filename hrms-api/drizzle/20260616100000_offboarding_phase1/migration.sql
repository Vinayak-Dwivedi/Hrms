-- Offboarding / Resignation Workflow — Phase 1.
-- Extends the bare `resignations` table into a full resignation lifecycle and
-- adds admin config (resignation_flows + scope, exit_reasons) and runtime
-- offboarding_cases. New enum values are only ADDED here, never USED in this
-- file (Postgres forbids using a freshly-added enum value in the same
-- transaction; the migration runner batches the whole file as one txn). The app
-- inserts resignation status explicitly, so the column default stays as-is.

-- 1. New status values on the existing resignation_status_enum.
ALTER TYPE "resignation_status_enum" ADD VALUE IF NOT EXISTS 'Submitted';--> statement-breakpoint
ALTER TYPE "resignation_status_enum" ADD VALUE IF NOT EXISTS 'ManagerApproved';--> statement-breakpoint
ALTER TYPE "resignation_status_enum" ADD VALUE IF NOT EXISTS 'ManagerRejected';--> statement-breakpoint
ALTER TYPE "resignation_status_enum" ADD VALUE IF NOT EXISTS 'HRApproved';--> statement-breakpoint
ALTER TYPE "resignation_status_enum" ADD VALUE IF NOT EXISTS 'OnHold';--> statement-breakpoint
ALTER TYPE "resignation_status_enum" ADD VALUE IF NOT EXISTS 'Rejected';--> statement-breakpoint

-- 2. Audit enum values for the resignation lifecycle.
ALTER TYPE "audit_entity_type_enum" ADD VALUE IF NOT EXISTS 'resignation';--> statement-breakpoint
ALTER TYPE "audit_entity_type_enum" ADD VALUE IF NOT EXISTS 'offboarding_case';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_SUBMITTED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_WITHDRAWN';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_APPROVED_BY_MANAGER';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_REJECTED_BY_MANAGER';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_APPROVED_BY_HR';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_REJECTED_BY_HR';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_ON_HOLD';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_CASE_CREATED';--> statement-breakpoint

-- 3. New enum types (idempotent).
DO $$ BEGIN
  CREATE TYPE "resignation_decision_enum" AS ENUM ('Approved', 'Rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "offboarding_case_status_enum" AS ENUM (
    'OffboardingInitiated', 'ClearancesComplete', 'FnFComplete', 'Closed', 'OnHold'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- 4. Admin config tables.
CREATE TABLE IF NOT EXISTS "resignation_flows" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "notice_period_days" integer NOT NULL DEFAULT 30,
  "buyout_allowed" boolean NOT NULL DEFAULT true,
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "resignation_flow_scope" (
  "id" serial PRIMARY KEY NOT NULL,
  "flow_id" integer NOT NULL REFERENCES "resignation_flows"("id") ON DELETE CASCADE,
  "scope_type" varchar(30) NOT NULL,
  "scope_id" integer,
  "priority" integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "exit_reasons" (
  "id" serial PRIMARY KEY NOT NULL,
  "label" varchar(120) NOT NULL UNIQUE,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- 5. Extend the resignations table.
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "flow_id" integer REFERENCES "resignation_flows"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "notice_period_days" integer;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "detailed_remark" text;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "attachment_path" varchar(500);--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "buyout_requested" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "validation" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "manager_id" integer REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "manager_decision" "resignation_decision_enum";--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "manager_decided_at" timestamptz;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "manager_remarks" text;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "recommended_lwd" date;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "knowledge_transfer_required" boolean;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "replacement_required" boolean;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "critical_resource" boolean;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "hr_id" integer REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "hr_decision" "resignation_decision_enum";--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "hr_decided_at" timestamptz;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "hr_remarks" text;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "modified_lwd" date;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "leave_encashment_eligible" boolean;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "recovery_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "gratuity_eligible" boolean;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "final_settlement_eligible" boolean;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "workflow_stages" jsonb;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "current_stage" integer NOT NULL DEFAULT 0;--> statement-breakpoint

-- 6. Runtime offboarding case.
CREATE TABLE IF NOT EXISTS "offboarding_cases" (
  "id" serial PRIMARY KEY NOT NULL,
  "case_number" varchar(30) NOT NULL UNIQUE,
  "resignation_id" integer NOT NULL REFERENCES "resignations"("id") ON DELETE CASCADE,
  "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "department_id" integer REFERENCES "departments"("id") ON DELETE SET NULL,
  "reporting_manager_id" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "date_of_joining" date,
  "resignation_date" date NOT NULL,
  "last_working_date" date NOT NULL,
  "notice_period_days" integer,
  "status" "offboarding_case_status_enum" NOT NULL DEFAULT 'OffboardingInitiated',
  "clearance_checklist" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- 7. Indexes.
CREATE INDEX IF NOT EXISTS "idx_resignation_employee" ON "resignations" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resignation_status" ON "resignations" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resignation_manager" ON "resignations" ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offboarding_case_employee" ON "offboarding_cases" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offboarding_case_status" ON "offboarding_cases" ("status");
