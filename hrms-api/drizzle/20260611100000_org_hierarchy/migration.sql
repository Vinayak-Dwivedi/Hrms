DO $$ BEGIN
  CREATE TYPE "public"."org_hierarchy_status_enum" AS ENUM('Active', 'Inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_hierarchy_departments" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer,
  "name" varchar(100) NOT NULL,
  "code" varchar(20) NOT NULL,
  "status" "org_hierarchy_status_enum" DEFAULT 'Active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_hierarchy_levels" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(5) NOT NULL,
  "name" varchar(100) NOT NULL,
  "sort_order" smallint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_hierarchy_sub_departments" (
  "id" serial PRIMARY KEY NOT NULL,
  "department_id" integer NOT NULL,
  "company_id" integer,
  "name" varchar(100) NOT NULL,
  "status" "org_hierarchy_status_enum" DEFAULT 'Active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_hierarchy_designations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(150) NOT NULL,
  "code" varchar(20),
  "level_id" integer NOT NULL,
  "status" "org_hierarchy_status_enum" DEFAULT 'Active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_hierarchy_grades" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(10) NOT NULL,
  "name" varchar(100) NOT NULL,
  "level_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_hierarchy_structure" (
  "id" serial PRIMARY KEY NOT NULL,
  "department_id" integer NOT NULL,
  "sub_department_id" integer NOT NULL,
  "designation_id" integer NOT NULL,
  "level_id" integer NOT NULL,
  "grade_id" integer NOT NULL,
  "company_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_sub_departments"
    ADD CONSTRAINT "org_hierarchy_sub_departments_department_id_org_hierarchy_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."org_hierarchy_departments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_designations"
    ADD CONSTRAINT "org_hierarchy_designations_level_id_org_hierarchy_levels_id_fk"
    FOREIGN KEY ("level_id") REFERENCES "public"."org_hierarchy_levels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_grades"
    ADD CONSTRAINT "org_hierarchy_grades_level_id_org_hierarchy_levels_id_fk"
    FOREIGN KEY ("level_id") REFERENCES "public"."org_hierarchy_levels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_structure"
    ADD CONSTRAINT "org_hierarchy_structure_department_id_org_hierarchy_departments_id_fk"
    FOREIGN KEY ("department_id") REFERENCES "public"."org_hierarchy_departments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_structure"
    ADD CONSTRAINT "org_hierarchy_structure_sub_department_id_org_hierarchy_sub_departments_id_fk"
    FOREIGN KEY ("sub_department_id") REFERENCES "public"."org_hierarchy_sub_departments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_structure"
    ADD CONSTRAINT "org_hierarchy_structure_designation_id_org_hierarchy_designations_id_fk"
    FOREIGN KEY ("designation_id") REFERENCES "public"."org_hierarchy_designations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_structure"
    ADD CONSTRAINT "org_hierarchy_structure_level_id_org_hierarchy_levels_id_fk"
    FOREIGN KEY ("level_id") REFERENCES "public"."org_hierarchy_levels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "org_hierarchy_structure"
    ADD CONSTRAINT "org_hierarchy_structure_grade_id_org_hierarchy_grades_id_fk"
    FOREIGN KEY ("grade_id") REFERENCES "public"."org_hierarchy_grades"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_dept_company_name_uq" ON "org_hierarchy_departments" (COALESCE("company_id", -1), "name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_dept_company_code_uq" ON "org_hierarchy_departments" (COALESCE("company_id", -1), "code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_dept_company" ON "org_hierarchy_departments" ("company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_levels_code_uq" ON "org_hierarchy_levels" ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_sub_dept_name_uq" ON "org_hierarchy_sub_departments" ("department_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_sub_dept_dept" ON "org_hierarchy_sub_departments" ("department_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_designations_name_uq" ON "org_hierarchy_designations" ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_designations_code_uq" ON "org_hierarchy_designations" ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_designations_level" ON "org_hierarchy_designations" ("level_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_grades_level_code_uq" ON "org_hierarchy_grades" ("level_id", "code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_grades_level" ON "org_hierarchy_grades" ("level_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_hierarchy_structure_uq" ON "org_hierarchy_structure" ("department_id", "sub_department_id", "designation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_structure_dept" ON "org_hierarchy_structure" ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_hierarchy_structure_sub_dept" ON "org_hierarchy_structure" ("sub_department_id");
--> statement-breakpoint
INSERT INTO "org_hierarchy_levels" ("code", "name", "sort_order")
VALUES
  ('L1', 'Executive', 1),
  ('L2', 'Sr Executive', 2),
  ('L3', 'Manager', 3),
  ('L4', 'HOD', 4),
  ('L5', 'Director', 5)
ON CONFLICT ("code") DO NOTHING;
