-- Employee work location (branch id from Org Setup → Location / branches registry).
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "location_id" integer;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "employees"
    ADD CONSTRAINT "employees_location_id_branches_id_fk"
    FOREIGN KEY ("location_id") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emp_location" ON "employees" ("location_id");
--> statement-breakpoint
UPDATE "employees"
SET "location_id" = "branch_id"
WHERE "location_id" IS NULL AND "branch_id" IS NOT NULL;
