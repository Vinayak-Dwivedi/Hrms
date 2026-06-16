-- Sub-departments (process/campaign under a department) and optional
-- employees.sub_department_id link for policy / workflow scoping.

CREATE TABLE IF NOT EXISTS "sub_departments" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" varchar(20),
  "department_id" integer REFERENCES "departments"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "sub_departments_name_key"
  ON "sub_departments" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sub_departments_code_key"
  ON "sub_departments" ("code");--> statement-breakpoint

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "sub_department_id" integer
  REFERENCES "sub_departments"("id") ON DELETE SET NULL;
