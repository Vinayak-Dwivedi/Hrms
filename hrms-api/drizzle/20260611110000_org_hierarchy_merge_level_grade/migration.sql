-- Merge grades into levels: level is the single pay-band master (L1, G5, etc.)
ALTER TABLE "org_hierarchy_structure" DROP CONSTRAINT IF EXISTS "org_hierarchy_structure_grade_id_org_hierarchy_grades_id_fk";
--> statement-breakpoint
ALTER TABLE "org_hierarchy_structure" DROP COLUMN IF EXISTS "grade_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "org_hierarchy_grades";
--> statement-breakpoint
ALTER TABLE "org_hierarchy_levels" ALTER COLUMN "code" TYPE varchar(10);
