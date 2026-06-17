-- Offboarding Phase 4 — Full & Final Settlement (FnF).
-- One settlement per offboarding case + its earning/deduction line items.
-- Totals are computed from the line items at read time. New audit enum values
-- are only ADDED here (same-transaction rule).

-- 1. New enum types (idempotent).
DO $$ BEGIN
  CREATE TYPE "fnf_status_enum" AS ENUM ('Processing', 'Approved', 'Paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "fnf_line_kind_enum" AS ENUM ('Earning', 'Deduction');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- 2. Audit enum values.
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_FNF_UPDATED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_FNF_APPROVED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'OFFBOARDING_FNF_PAID';--> statement-breakpoint

-- 3. Tables.
CREATE TABLE IF NOT EXISTS "fnf_settlements" (
  "id" serial PRIMARY KEY NOT NULL,
  "case_id" integer NOT NULL UNIQUE REFERENCES "offboarding_cases"("id") ON DELETE CASCADE,
  "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "status" "fnf_status_enum" NOT NULL DEFAULT 'Processing',
  "notes" text,
  "approved_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "paid_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "paid_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fnf_line_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "settlement_id" integer NOT NULL REFERENCES "fnf_settlements"("id") ON DELETE CASCADE,
  "kind" "fnf_line_kind_enum" NOT NULL,
  "label" varchar(150) NOT NULL,
  "amount" numeric(12, 2) NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_fnf_line_settlement" ON "fnf_line_items" ("settlement_id");
