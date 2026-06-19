-- Unify the flat `sub_departments` table into `org_hierarchy_sub_departments`.
-- Repoint employees.sub_department_id at the org table and drop the legacy
-- table. No employee references the legacy table (sub_department_id is null for
-- all), so there's no data to remap — defensively null any stray id that has no
-- org-table match before re-adding the FK. Idempotent.

ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_sub_department_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_sub_department_id_org_hierarchy_sub_departments_id_fk";

UPDATE "employees" e
   SET "sub_department_id" = NULL
 WHERE e."sub_department_id" IS NOT NULL
   AND NOT EXISTS (
         SELECT 1 FROM "org_hierarchy_sub_departments" o WHERE o."id" = e."sub_department_id"
       );

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_sub_department_id_org_hierarchy_sub_departments_id_fk"
  FOREIGN KEY ("sub_department_id") REFERENCES "org_hierarchy_sub_departments"("id") ON DELETE SET NULL;

DROP TABLE IF EXISTS "sub_departments";
