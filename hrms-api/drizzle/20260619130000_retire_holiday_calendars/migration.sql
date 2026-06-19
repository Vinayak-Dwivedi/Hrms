-- Retire the holiday-calendar / team model. Holidays are now scoped per-holiday
-- via `holidays.scope`, so the calendar tables and the vestigial
-- `holidays.calendar_id` are removed. Dropping the column also drops its FK and
-- the index that referenced it. Idempotent.

DROP INDEX IF EXISTS "idx_holidays_calendar";
ALTER TABLE "holidays" DROP COLUMN IF EXISTS "calendar_id";

DROP TABLE IF EXISTS "holiday_team_links";
DROP TABLE IF EXISTS "holiday_calendar_scope";
DROP TABLE IF EXISTS "holiday_calendars";
