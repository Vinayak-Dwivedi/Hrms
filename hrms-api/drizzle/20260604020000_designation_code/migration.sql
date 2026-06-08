-- Org Setup → Designation: add a short unique code to designations.
ALTER TABLE "designations" ADD COLUMN IF NOT EXISTS "code" varchar(20);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "designations_code_unique" ON "designations"("code");
