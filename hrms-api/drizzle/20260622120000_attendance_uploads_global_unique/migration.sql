-- Keep the latest staging row per employee_code + attendance_date before enforcing global uniqueness.
DELETE FROM "attendance_uploads" a
USING "attendance_uploads" b
WHERE a."employee_code" = b."employee_code"
  AND a."attendance_date" = b."attendance_date"
  AND a."id" < b."id";

DROP INDEX IF EXISTS "attendance_uploads_batch_emp_date_uidx";

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_uploads_emp_date_uidx"
  ON "attendance_uploads" ("employee_code", "attendance_date");
