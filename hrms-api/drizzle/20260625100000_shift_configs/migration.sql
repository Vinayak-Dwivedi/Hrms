-- Shift configurations: named work shifts with start/end times and org scope.

CREATE TABLE IF NOT EXISTS "shift_configs" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'Draft',
  "is_default" boolean NOT NULL DEFAULT false,
  "grace_minutes" integer NOT NULL DEFAULT 0,
  "break_minutes" integer NOT NULL DEFAULT 0,
  "created_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "shift_configs_name_unique"
  ON "shift_configs" ("name");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "shift_scope" (
  "id" serial PRIMARY KEY NOT NULL,
  "shift_config_id" integer NOT NULL REFERENCES "shift_configs"("id") ON DELETE CASCADE,
  "scope_type" varchar(30) NOT NULL,
  "scope_id" integer,
  "priority" integer NOT NULL DEFAULT 100,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_shift_scope_config"
  ON "shift_scope" ("shift_config_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_shift_scope_lookup"
  ON "shift_scope" ("scope_type", "scope_id");
