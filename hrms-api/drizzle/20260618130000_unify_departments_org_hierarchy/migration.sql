-- Unify the legacy `departments` table into `org_hierarchy_departments`, making
-- the org-hierarchy department table the single source of truth. The real
-- department (Operations) already exists as an org-hierarchy row; this migration
-- carries the legacy columns onto the org table, remaps every reference
-- (employees, offboarding cases, the designation/sub-department parent FK, and
-- the Department-scoped scope rows) from the legacy id to the org id, and drops
-- the legacy table. Fully idempotent.

-- 1. Carry the legacy department columns onto the org table so the existing
--    /api/hrms/departments CRUD + the Departments admin screen keep working
--    against the unified table. `manager_id` (the department lead) is also used
--    by the approval-workflow routing.
ALTER TABLE "org_hierarchy_departments"
  ADD COLUMN IF NOT EXISTS "manager_id" integer REFERENCES "employees"("id") ON DELETE SET NULL;
ALTER TABLE "org_hierarchy_departments"
  ADD COLUMN IF NOT EXISTS "location_area" varchar(200);
ALTER TABLE "org_hierarchy_departments"
  ADD COLUMN IF NOT EXISTS "headcount" integer NOT NULL DEFAULT 0;

-- The legacy create flow doesn't supply a code, so make it optional.
ALTER TABLE "org_hierarchy_departments" ALTER COLUMN "code" DROP NOT NULL;

-- 2. Detach the FKs that point at the legacy table so the data can be remapped.
ALTER TABLE "employees"          DROP CONSTRAINT IF EXISTS "employees_department_id_departments_id_fkey";
ALTER TABLE "offboarding_cases"  DROP CONSTRAINT IF EXISTS "offboarding_cases_department_id_fkey";
ALTER TABLE "designations"       DROP CONSTRAINT IF EXISTS "designations_department_id_departments_id_fkey";
ALTER TABLE "sub_departments"    DROP CONSTRAINT IF EXISTS "sub_departments_department_id_fkey";

-- 3. Remap every legacy department id to its matching org-hierarchy id (matched
--    by name), then copy the lead/location/headcount onto the org row. Guarded
--    by the legacy table still existing so re-runs are no-ops.
DO $$
DECLARE
  m RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
    -- Ensure every legacy department has a matching row (by name) in the unified
    -- table. On environments where the org-hierarchy table was never populated
    -- (e.g. production), this creates the rows so the remap below can re-point
    -- every reference instead of orphaning it. `code` is dropped when it would
    -- collide with an existing org code.
    INSERT INTO "org_hierarchy_departments" ("company_id", "name", "code", "location_area", "headcount")
    SELECT NULL,
           d."name",
           CASE WHEN EXISTS (SELECT 1 FROM "org_hierarchy_departments" o2 WHERE o2."code" = d."code")
                THEN NULL ELSE d."code" END,
           d."location_area",
           d."headcount"
      FROM "departments" d
     WHERE NOT EXISTS (
             SELECT 1 FROM "org_hierarchy_departments" o WHERE lower(o."name") = lower(d."name")
           );

    FOR m IN
      SELECT d.id AS legacy_id, o.id AS org_id, d.manager_id, d.location_area, d.headcount
        FROM "departments" d
        JOIN "org_hierarchy_departments" o ON lower(o.name) = lower(d.name)
    LOOP
      UPDATE "employees"         SET "department_id" = m.org_id WHERE "department_id" = m.legacy_id;
      UPDATE "offboarding_cases" SET "department_id" = m.org_id WHERE "department_id" = m.legacy_id;
      UPDATE "designations"      SET "department_id" = m.org_id WHERE "department_id" = m.legacy_id;
      UPDATE "sub_departments"   SET "department_id" = m.org_id WHERE "department_id" = m.legacy_id;

      UPDATE "clearance_template_scope"     SET "scope_id" = m.org_id WHERE "scope_type" = 'Department' AND "scope_id" = m.legacy_id;
      UPDATE "exit_interview_template_scope" SET "scope_id" = m.org_id WHERE "scope_type" = 'Department' AND "scope_id" = m.legacy_id;
      UPDATE "holiday_calendar_scope"       SET "scope_id" = m.org_id WHERE "scope_type" = 'Department' AND "scope_id" = m.legacy_id;
      UPDATE "leave_plan_scope"             SET "scope_id" = m.org_id WHERE "scope_type" = 'Department' AND "scope_id" = m.legacy_id;
      UPDATE "leave_policy_scope"           SET "scope_id" = m.org_id WHERE "scope_type" = 'Department' AND "scope_id" = m.legacy_id;
      UPDATE "resignation_flow_scope"       SET "scope_id" = m.org_id WHERE "scope_type" = 'Department' AND "scope_id" = m.legacy_id;
      UPDATE "weekly_off_scope"             SET "scope_id" = m.org_id WHERE "scope_type" = 'Department' AND "scope_id" = m.legacy_id;

      UPDATE "org_hierarchy_departments" o
         SET "manager_id"    = COALESCE(o."manager_id", m.manager_id),
             "location_area" = COALESCE(o."location_area", m.location_area),
             "headcount"     = GREATEST(o."headcount", COALESCE(m.headcount, 0))
       WHERE o."id" = m.org_id;
    END LOOP;
  END IF;
END $$;

-- 4. Re-point the FKs at the unified org-hierarchy table.
ALTER TABLE "employees"         DROP CONSTRAINT IF EXISTS "employees_department_id_org_hierarchy_departments_id_fk";
ALTER TABLE "employees"         ADD  CONSTRAINT "employees_department_id_org_hierarchy_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "org_hierarchy_departments"("id") ON DELETE SET NULL;

ALTER TABLE "offboarding_cases" DROP CONSTRAINT IF EXISTS "offboarding_cases_department_id_org_hierarchy_departments_id_fk";
ALTER TABLE "offboarding_cases" ADD  CONSTRAINT "offboarding_cases_department_id_org_hierarchy_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "org_hierarchy_departments"("id") ON DELETE SET NULL;

ALTER TABLE "designations"      DROP CONSTRAINT IF EXISTS "designations_department_id_org_hierarchy_departments_id_fk";
ALTER TABLE "designations"      ADD  CONSTRAINT "designations_department_id_org_hierarchy_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "org_hierarchy_departments"("id") ON DELETE SET NULL;

ALTER TABLE "sub_departments"   DROP CONSTRAINT IF EXISTS "sub_departments_department_id_org_hierarchy_departments_id_fk";
ALTER TABLE "sub_departments"   ADD  CONSTRAINT "sub_departments_department_id_org_hierarchy_departments_id_fk"
  FOREIGN KEY ("department_id") REFERENCES "org_hierarchy_departments"("id") ON DELETE SET NULL;

-- 5. Drop the now-unreferenced legacy table.
DROP TABLE IF EXISTS "departments";
