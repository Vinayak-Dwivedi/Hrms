-- Offboarding — custom clearance teams.
-- Converts clearance team columns from the fixed enum to free-form varchar so
-- admins can add new clearance areas (e.g. Legal, Security) beyond the 6
-- built-ins, and flags the built-ins so they can't be deleted. Idempotent.

-- 1. clearance_templates.team : enum -> varchar(50)
DO $$ BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'clearance_templates' AND column_name = 'team'
  ) <> 'character varying' THEN
    ALTER TABLE "clearance_templates"
      ALTER COLUMN "team" TYPE varchar(50) USING "team"::text;
  END IF;
END $$;--> statement-breakpoint

-- 2. clearance_tasks.team : enum -> varchar(50)
DO $$ BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'clearance_tasks' AND column_name = 'team'
  ) <> 'character varying' THEN
    ALTER TABLE "clearance_tasks"
      ALTER COLUMN "team" TYPE varchar(50) USING "team"::text;
  END IF;
END $$;--> statement-breakpoint

-- 3. is_builtin flag + mark the original 6 teams.
ALTER TABLE "clearance_templates"
  ADD COLUMN IF NOT EXISTS "is_builtin" boolean NOT NULL DEFAULT false;--> statement-breakpoint

UPDATE "clearance_templates"
  SET "is_builtin" = true
  WHERE "team" IN ('ReportingManager', 'IT', 'Admin', 'Finance', 'HR', 'Operations');
