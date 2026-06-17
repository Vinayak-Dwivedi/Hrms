-- Catchup: leave_requests table is missing columns added after initial export.sql.
-- Adds hr_*, workflow_stages, current_stage columns safely.

-- 1. Create hr_decision_enum type if absent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_decision_enum') THEN
    CREATE TYPE hr_decision_enum AS ENUM ('Pending', 'Approved', 'Rejected', 'Override');
  END IF;
END
$$;

-- 2. Add missing columns to leave_requests
ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "hr_id" integer
    REFERENCES "employees"("id") ON DELETE SET NULL;

ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "hr_decision" hr_decision_enum;

ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "hr_decided_at" timestamptz;

ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "hr_remarks" text;

ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "workflow_stages" jsonb;

ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "current_stage" integer NOT NULL DEFAULT 0;
