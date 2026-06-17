-- Offboarding Phase 3 — Exit Interview.
-- Adds exit-interview templates (admin-built, dynamic questions) and one
-- response per offboarding case. New audit enum value is only ADDED here.

-- 1. New enum type (idempotent).
DO $$ BEGIN
  CREATE TYPE "exit_interview_status_enum" AS ENUM ('Pending', 'Completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- 2. Audit enum value.
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'EXIT_INTERVIEW_SUBMITTED';--> statement-breakpoint

-- 3. Tables.
CREATE TABLE IF NOT EXISTS "exit_interview_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_by" integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "exit_interview_responses" (
  "id" serial PRIMARY KEY NOT NULL,
  "case_id" integer NOT NULL UNIQUE REFERENCES "offboarding_cases"("id") ON DELETE CASCADE,
  "template_id" integer REFERENCES "exit_interview_templates"("id") ON DELETE SET NULL,
  "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "status" "exit_interview_status_enum" NOT NULL DEFAULT 'Pending',
  "answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "submitted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_exit_interview_employee" ON "exit_interview_responses" ("employee_id");--> statement-breakpoint

-- 4. Seed a default template covering all eight question types (only if none).
INSERT INTO "exit_interview_templates" ("name", "description", "is_default", "questions")
SELECT
  'Standard Exit Interview',
  'Default exit survey covering experience, reasons, and feedback.',
  true,
  '[
    {"id":"q1","type":"star","label":"Overall, how would you rate your experience working here?","required":true,"scaleMax":5},
    {"id":"q2","type":"nps","label":"How likely are you to recommend us as a place to work?","required":true},
    {"id":"q3","type":"single_choice","label":"Primary reason for leaving","required":true,"options":["Compensation","Career Growth","Work-Life Balance","Management","Relocation","Other"]},
    {"id":"q4","type":"multiple_choice","label":"Which areas need the most improvement?","required":false,"options":["Communication","Recognition","Training","Tools and Resources","Career Development"]},
    {"id":"q5","type":"rating_scale","label":"How would you rate your relationship with your manager?","required":false,"scaleMax":5},
    {"id":"q6","type":"yes_no","label":"Would you consider returning in the future?","required":false},
    {"id":"q7","type":"comments","label":"What did you enjoy most about working here?","required":false},
    {"id":"q8","type":"comments","label":"What could we have done better?","required":false},
    {"id":"q9","type":"date","label":"Available until (for any follow-up or knowledge transfer)?","required":false}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "exit_interview_templates");
