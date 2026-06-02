-- Holiday calendar. holiday_type_enum already exists from the init migration.
CREATE TABLE IF NOT EXISTS "holidays" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" date NOT NULL,
  "name" varchar(200) NOT NULL,
  "type" "holiday_type_enum" DEFAULT 'National' NOT NULL,
  "branch_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "holidays_branch_id_fk"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_holidays_date" ON "holidays"("date");
