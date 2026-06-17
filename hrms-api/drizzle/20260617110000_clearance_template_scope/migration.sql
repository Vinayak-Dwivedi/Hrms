-- Offboarding — clearance department/sub-department scoping.
-- A clearance template with no scope rows applies to every case; otherwise it
-- only seeds for employees whose department/sub-department matches a scope row.

CREATE TABLE IF NOT EXISTS "clearance_template_scope" (
  "id" serial PRIMARY KEY NOT NULL,
  "template_id" integer NOT NULL REFERENCES "clearance_templates"("id") ON DELETE CASCADE,
  "scope_type" varchar(20) NOT NULL,
  "scope_id" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_clearance_scope_template" ON "clearance_template_scope" ("template_id");
