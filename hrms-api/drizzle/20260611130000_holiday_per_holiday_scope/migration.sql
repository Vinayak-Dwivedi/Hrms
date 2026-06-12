-- Per-holiday scope: each individual holiday can specify which employee
-- groups it applies to. Stored as a JSONB array of
-- { scopeType, scopeId } rows.
--
-- Resolution rule (consumed by leave-validation in M5):
--   - Empty array → holiday applies to everyone in the calendar's scope
--   - Non-empty → holiday only applies to employees matching at least one
--     of the rows.
--
-- This is in addition to the calendar-level holiday_calendar_scope, which
-- decides which employees see this calendar at all.

ALTER TABLE "holidays" ADD COLUMN IF NOT EXISTS "scope" jsonb NOT NULL DEFAULT '[]'::jsonb;
