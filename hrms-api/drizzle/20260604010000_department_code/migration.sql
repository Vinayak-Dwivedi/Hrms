-- Org Setup → Department: add a short unique code to departments.
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "code" varchar(20);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "departments_code_unique" ON "departments"("code");
