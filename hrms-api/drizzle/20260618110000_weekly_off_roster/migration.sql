-- Weekly-off Roster engine — per-employee off-day assignments for Roster-mode
-- configs. Each row marks one employee off on one date. Idempotent.

CREATE TABLE IF NOT EXISTS "weekly_off_roster_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "config_id" integer NOT NULL REFERENCES "weekly_off_configs"("id") ON DELETE CASCADE,
  "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "off_date" date NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_off_roster_unique" ON "weekly_off_roster_entries" ("employee_id", "off_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_weekly_off_roster_config" ON "weekly_off_roster_entries" ("config_id");
