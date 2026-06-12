-- Holiday calendars: named collections of holidays (Corporate, Delhi,
-- Uttarakhand, Beetel) that can later be assigned to employee groups by
-- branch/department/location/etc. via holiday_calendar_scope.
--
-- The existing holidays table (single flat list scoped to a branch) is
-- preserved. We add calendar_id (nullable so legacy rows remain valid) plus
-- two metadata columns. New writes go through a calendar; the legacy
-- branch_id path stays available until M4 removes its last consumer.

-- Extend holiday_type_enum with the two values the editor exposes.
ALTER TYPE "holiday_type_enum" ADD VALUE IF NOT EXISTS 'Restricted';--> statement-breakpoint
ALTER TYPE "holiday_type_enum" ADD VALUE IF NOT EXISTS 'Festival';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "holiday_calendars" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "status" varchar(20) NOT NULL DEFAULT 'Draft',
  "created_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "holiday_calendars_name_unique"
  ON "holiday_calendars" ("name");--> statement-breakpoint

ALTER TABLE "holidays" ADD COLUMN IF NOT EXISTS "calendar_id" integer
  REFERENCES "holiday_calendars"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "holidays" ADD COLUMN IF NOT EXISTS "is_half_day" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "holidays" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_holidays_calendar"
  ON "holidays" ("calendar_id", "date");--> statement-breakpoint

-- Scope assignment: which employees a given calendar applies to. Mirrors
-- leave_policy_scope so M4's resolver can share the specificity-ranking
-- logic. scope_id is NULL when scope_type='Company' (applies to everyone).
CREATE TABLE IF NOT EXISTS "holiday_calendar_scope" (
  "id" serial PRIMARY KEY NOT NULL,
  "calendar_id" integer NOT NULL REFERENCES "holiday_calendars"("id") ON DELETE CASCADE,
  "scope_type" varchar(30) NOT NULL,
  "scope_id" integer,
  "priority" integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_holiday_calendar_scope_calendar"
  ON "holiday_calendar_scope" ("calendar_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_holiday_calendar_scope_lookup"
  ON "holiday_calendar_scope" ("scope_type", "scope_id");
