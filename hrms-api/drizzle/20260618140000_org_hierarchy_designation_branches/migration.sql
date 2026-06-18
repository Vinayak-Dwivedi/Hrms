-- Designation ↔ Branch (location) many-to-many for Department Hierarchy.
-- Empty join set means the designation applies to all locations.

CREATE TABLE IF NOT EXISTS "org_hierarchy_designation_branches" (
  "designation_id" integer NOT NULL,
  "branch_id" integer NOT NULL,
  CONSTRAINT "org_hierarchy_designation_branches_pkey"
    PRIMARY KEY ("designation_id", "branch_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_designation_branches_branch"
  ON "org_hierarchy_designation_branches" ("branch_id");--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "org_hierarchy_designation_branches"
    ADD CONSTRAINT "org_hierarchy_designation_branches_designation_id_fkey"
    FOREIGN KEY ("designation_id") REFERENCES "org_hierarchy_designations"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "org_hierarchy_designation_branches"
    ADD CONSTRAINT "org_hierarchy_designation_branches_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
