-- Parent table for Excel upload batches.
CREATE TABLE IF NOT EXISTS "attendance" (
  "id" serial PRIMARY KEY NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "total_records" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "attendance_total_records_chk" CHECK ("total_records" >= 0)
);

CREATE INDEX IF NOT EXISTS "idx_attendance_created_at"
  ON "attendance" ("created_at");

ALTER TABLE "attendance_uploads" ADD COLUMN IF NOT EXISTS "attendance_id" integer;

-- Backfill any pre-existing staging rows into a single legacy batch.
DO $$
DECLARE
  legacy_id integer;
BEGIN
  IF EXISTS (SELECT 1 FROM "attendance_uploads" WHERE "attendance_id" IS NULL LIMIT 1) THEN
    INSERT INTO "attendance" ("file_name", "total_records")
    VALUES ('legacy-import', (SELECT COUNT(*)::integer FROM "attendance_uploads"))
    RETURNING "id" INTO legacy_id;

    UPDATE "attendance_uploads"
    SET "attendance_id" = legacy_id
    WHERE "attendance_id" IS NULL;
  END IF;
END $$;

ALTER TABLE "attendance_uploads" ALTER COLUMN "attendance_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "attendance_uploads"
    ADD CONSTRAINT "attendance_uploads_attendance_id_attendance_id_fk"
    FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id")
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "attendance_uploads_emp_date_uidx";

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_uploads_batch_emp_date_uidx"
  ON "attendance_uploads" ("attendance_id", "employee_code", "attendance_date");

CREATE INDEX IF NOT EXISTS "idx_att_upload_attendance_id"
  ON "attendance_uploads" ("attendance_id");
