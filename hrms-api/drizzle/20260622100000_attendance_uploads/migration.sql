-- Attendance upload batches (Excel file metadata).
CREATE TABLE IF NOT EXISTS "attendance" (
  "id" serial PRIMARY KEY NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "total_records" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "attendance_total_records_chk" CHECK ("total_records" >= 0)
);

CREATE INDEX IF NOT EXISTS "idx_attendance_created_at"
  ON "attendance" ("created_at");

-- Raw attendance import staging table (Excel row data per batch).
CREATE TABLE IF NOT EXISTS "attendance_uploads" (
  "id" serial PRIMARY KEY NOT NULL,
  "attendance_id" integer NOT NULL,
  "employee_code" varchar(20) NOT NULL,
  "in_time" time,
  "out_time" time,
  "total_hours" time,
  "attendance_date" date NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "attendance_uploads"
  ADD CONSTRAINT "attendance_uploads_attendance_id_attendance_id_fk"
  FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id")
  ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_uploads_batch_emp_date_uidx"
  ON "attendance_uploads" ("attendance_id", "employee_code", "attendance_date");

CREATE INDEX IF NOT EXISTS "idx_att_upload_attendance_id"
  ON "attendance_uploads" ("attendance_id");

CREATE INDEX IF NOT EXISTS "idx_att_upload_date"
  ON "attendance_uploads" ("attendance_date");
