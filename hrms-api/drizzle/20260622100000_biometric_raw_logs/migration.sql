-- Stores every raw punch event pushed by the ESSL biometric device via the
-- ADMS/ICLOCK protocol. Attendance records are derived from these raw logs.
CREATE TABLE IF NOT EXISTS "biometric_raw_logs" (
  "id"          serial PRIMARY KEY NOT NULL,
  "device_sn"   varchar(50)  NOT NULL,
  "employee_id" integer      REFERENCES "employees"("id") ON DELETE SET NULL,
  "raw_user_id" varchar(50)  NOT NULL,
  "punch_time"  timestamp with time zone NOT NULL,
  "punch_type"  smallint     NOT NULL DEFAULT 0,
  "verify_type" smallint     DEFAULT 1,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bio_raw_unique"
  ON "biometric_raw_logs" ("device_sn", "raw_user_id", "punch_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_raw_employee"
  ON "biometric_raw_logs" ("employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_raw_punch_time"
  ON "biometric_raw_logs" ("punch_time");
