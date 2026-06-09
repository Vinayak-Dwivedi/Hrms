-- Extend leave_types catalog with HR-configurable settings:
--   color, description, paid/unpaid, half-day, gender restriction,
--   notice + proof + max-continuous-day policies, soft-delete.

ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "color"
  varchar(10) NOT NULL DEFAULT '#dc143c';
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_active"
  boolean NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_paid"
  boolean NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "allow_half_day"
  boolean NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "allow_negative_balance"
  boolean NOT NULL DEFAULT false;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "gender_restriction"
  varchar(10);
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "min_notice_days"
  integer NOT NULL DEFAULT 0;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "requires_proof_after_days"
  integer;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "max_continuous_days"
  integer;
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "updated_at"
  timestamp with time zone NOT NULL DEFAULT now();

-- Add gender check constraint (drop+recreate to be re-runnable).
ALTER TABLE "leave_types" DROP CONSTRAINT IF EXISTS "leave_types_gender_chk";
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_gender_chk"
  CHECK ("gender_restriction" IS NULL OR "gender_restriction" IN ('Male', 'Female'));

-- Seed sensible defaults for the existing 5 leave types so the UI shows
-- something meaningful out of the box. Only updates rows still at the old
-- defaults — won't clobber values an admin already set.
UPDATE "leave_types" SET color = '#10b981', description = 'Privilege leave for vacation, leisure and personal planning.',
       min_notice_days = 3
  WHERE code = 'AL' AND description IS NULL;
UPDATE "leave_types" SET color = '#3b82f6', description = 'Medical leave to recover from sickness or attend healthcare visits.',
       requires_proof_after_days = 3, allow_negative_balance = true
  WHERE code = 'SL' AND description IS NULL;
UPDATE "leave_types" SET color = '#f59e0b', description = 'Unplanned short absences for sudden domestic or urgent matters.'
  WHERE code = 'CL' AND description IS NULL;
UPDATE "leave_types" SET color = '#ef4444', description = 'Earned compensatory off days granted in lieu of holiday/weekend work.',
       min_notice_days = 1
  WHERE code = 'CO' AND description IS NULL;
UPDATE "leave_types" SET color = '#8b5cf6', description = 'Accrued leave that carries forward and can be encashed on exit.',
       min_notice_days = 7
  WHERE code = 'EL' AND description IS NULL;
