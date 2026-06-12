-- Weekly-off configurations: named patterns that define which days of the
-- week are non-working days for an employee group.
--
-- Three modes:
--   - Fixed       — e.g. Sunday off every week. settings.days = ['Sunday'].
--   - Rotational  — e.g. 1 off per week on a 4-week cycle. settings =
--                   { offsPerWeek, cycleWeeks, pattern[] }.
--   - Roster      — manually maintained schedule.
--                   settings.description is free-form for now; the M4
--                   resolver will read this and look up the actual roster
--                   when we add it.

CREATE TABLE IF NOT EXISTS "weekly_off_configs" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "status" varchar(20) NOT NULL DEFAULT 'Draft',
  -- 'Fixed' | 'Rotational' | 'Roster'
  "mode" varchar(20) NOT NULL DEFAULT 'Fixed',
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_off_configs_name_unique"
  ON "weekly_off_configs" ("name");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "weekly_off_scope" (
  "id" serial PRIMARY KEY NOT NULL,
  "config_id" integer NOT NULL REFERENCES "weekly_off_configs"("id") ON DELETE CASCADE,
  "scope_type" varchar(30) NOT NULL,
  "scope_id" integer,
  "priority" integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_weekly_off_scope_config"
  ON "weekly_off_scope" ("config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_weekly_off_scope_lookup"
  ON "weekly_off_scope" ("scope_type", "scope_id");
