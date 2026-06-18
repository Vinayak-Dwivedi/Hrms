-- Offboarding — exit-interview template department/sub-department/location scoping.
-- A template with no scope rows is the catch-all; otherwise the most-specific
-- matching template (by Company < Branch < Department < SubDepartment) is
-- assigned to the employee's case. Mirrors clearance_template_scope. Idempotent.

CREATE TABLE IF NOT EXISTS "exit_interview_template_scope" (
  "id" serial PRIMARY KEY NOT NULL,
  "template_id" integer NOT NULL REFERENCES "exit_interview_templates"("id") ON DELETE CASCADE,
  "scope_type" varchar(20) NOT NULL,
  "scope_id" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_exit_template_scope_template" ON "exit_interview_template_scope" ("template_id");
