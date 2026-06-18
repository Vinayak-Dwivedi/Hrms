-- Sub-department ↔ Branch (location) many-to-many for Department Hierarchy.
-- Empty join set means the sub-department applies to all locations.

CREATE TABLE IF NOT EXISTS "org_hierarchy_sub_department_branches" (
  "sub_department_id" integer NOT NULL,
  "branch_id" integer NOT NULL,
  CONSTRAINT "org_hierarchy_sub_department_branches_pkey"
    PRIMARY KEY ("sub_department_id", "branch_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_sub_dept_branches_branch"
  ON "org_hierarchy_sub_department_branches" ("branch_id");--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "org_hierarchy_sub_department_branches"
    ADD CONSTRAINT "org_hierarchy_sub_department_branches_sub_department_id_fkey"
    FOREIGN KEY ("sub_department_id") REFERENCES "org_hierarchy_sub_departments"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "org_hierarchy_sub_department_branches"
    ADD CONSTRAINT "org_hierarchy_sub_department_branches_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
