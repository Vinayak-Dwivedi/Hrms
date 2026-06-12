ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "org_hierarchy_structure_id" integer;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "employees"
    ADD CONSTRAINT "employees_org_hierarchy_structure_id_fk"
    FOREIGN KEY ("org_hierarchy_structure_id")
    REFERENCES "public"."org_hierarchy_structure"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emp_org_hierarchy_structure"
  ON "employees" ("org_hierarchy_structure_id");