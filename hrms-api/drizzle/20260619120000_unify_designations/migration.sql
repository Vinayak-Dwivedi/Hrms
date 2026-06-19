-- Unify the flat `designations` table into `org_hierarchy_designations`.
-- For every legacy designation missing (by name) from the org table, create it
-- (org designations require a level — use the lowest-sort-order level as a
-- placeholder the admin can reassign in the Masters UI), remap employees from
-- the legacy id to the matching org id, then drop the legacy table. Idempotent.

ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_designation_id_designations_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_designation_id_org_hierarchy_designations_id_fk";

DO $$
DECLARE
  default_level integer;
  m RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'designations') THEN
    SELECT "id" INTO default_level FROM "org_hierarchy_levels" ORDER BY "sort_order", "id" LIMIT 1;

    IF default_level IS NOT NULL THEN
      -- Create any legacy designation missing (by name) from the org table.
      -- `code` is dropped when it would collide with an existing org code.
      INSERT INTO "org_hierarchy_designations" ("name", "code", "level_id")
      SELECT d."name",
             CASE WHEN EXISTS (SELECT 1 FROM "org_hierarchy_designations" o2 WHERE o2."code" = d."code")
                  THEN NULL ELSE d."code" END,
             default_level
        FROM "designations" d
       WHERE NOT EXISTS (
               SELECT 1 FROM "org_hierarchy_designations" o WHERE lower(o."name") = lower(d."name")
             );
    END IF;

    -- Remap employees from each legacy id to the matching org id (by name).
    FOR m IN
      SELECT d."id" AS legacy_id, o."id" AS org_id
        FROM "designations" d
        JOIN "org_hierarchy_designations" o ON lower(o."name") = lower(d."name")
    LOOP
      UPDATE "employees" SET "designation_id" = m.org_id WHERE "designation_id" = m.legacy_id;
    END LOOP;

    -- Null any employee still pointing at a non-org id so the new FK is valid.
    UPDATE "employees" e
       SET "designation_id" = NULL
     WHERE e."designation_id" IS NOT NULL
       AND NOT EXISTS (
             SELECT 1 FROM "org_hierarchy_designations" o WHERE o."id" = e."designation_id"
           );
  END IF;
END $$;

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_designation_id_org_hierarchy_designations_id_fk"
  FOREIGN KEY ("designation_id") REFERENCES "org_hierarchy_designations"("id") ON DELETE SET NULL;

DROP TABLE IF EXISTS "designations";
