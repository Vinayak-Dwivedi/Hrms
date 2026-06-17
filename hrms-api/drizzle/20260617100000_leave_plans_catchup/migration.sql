-- Catchup: leave plans tables were never in a Drizzle migration.
-- Creates all tables if missing; ALTER TABLE ADD COLUMN IF NOT EXISTS
-- handles partial installations where the table exists but newer columns don't.

-- 1. approval_workflows (must exist before leave_plans FK references it)
CREATE TABLE IF NOT EXISTS "approval_workflows" (
  "id"          serial PRIMARY KEY,
  "name"        varchar(150) NOT NULL UNIQUE,
  "description" text,
  "stages"      jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

-- 2. leave_plans (full definition for fresh installs)
CREATE TABLE IF NOT EXISTS "leave_plans" (
  "id"                   serial PRIMARY KEY,
  "name"                 varchar(150) NOT NULL UNIQUE,
  "description"          text,
  "status"               varchar(20) NOT NULL DEFAULT 'Draft',
  "is_default"           boolean NOT NULL DEFAULT false,
  "weekly_off_config_id" integer REFERENCES "weekly_off_configs"("id") ON DELETE SET NULL,
  "comp_off_enabled"     boolean NOT NULL DEFAULT false,
  "accrual_method"       varchar(10) NOT NULL DEFAULT 'Annual',
  "carry_forward_cap"    integer,
  "pro_rata_joiners"     boolean NOT NULL DEFAULT false,
  "approval_workflow_id" integer REFERENCES "approval_workflows"("id") ON DELETE SET NULL,
  "created_by"           integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "created_at"           timestamptz NOT NULL DEFAULT now(),
  "updated_at"           timestamptz NOT NULL DEFAULT now()
);

-- 2b. For existing installs where the table exists but newer columns are absent
ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "weekly_off_config_id" integer
    REFERENCES "weekly_off_configs"("id") ON DELETE SET NULL;
ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "comp_off_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "accrual_method" varchar(10) NOT NULL DEFAULT 'Annual';
ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "carry_forward_cap" integer;
ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "pro_rata_joiners" boolean NOT NULL DEFAULT false;
ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "approval_workflow_id" integer
    REFERENCES "approval_workflows"("id") ON DELETE SET NULL;
ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "created_by" integer
    REFERENCES "employees"("id") ON DELETE SET NULL;

-- 3. leave_plan_allocations
CREATE TABLE IF NOT EXISTS "leave_plan_allocations" (
  "id"            serial PRIMARY KEY,
  "plan_id"       integer NOT NULL REFERENCES "leave_plans"("id") ON DELETE CASCADE,
  "leave_type_id" integer NOT NULL REFERENCES "leave_types"("id") ON DELETE CASCADE,
  "annual_quota"  numeric(6,2) NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "leave_plan_alloc_uq"
  ON "leave_plan_allocations" ("plan_id", "leave_type_id");

-- 4. leave_plan_scope
CREATE TABLE IF NOT EXISTS "leave_plan_scope" (
  "id"         serial PRIMARY KEY,
  "plan_id"    integer NOT NULL REFERENCES "leave_plans"("id") ON DELETE CASCADE,
  "scope_type" varchar(30) NOT NULL,
  "scope_id"   integer,
  "priority"   integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_leave_plan_scope_plan"
  ON "leave_plan_scope" ("plan_id");
