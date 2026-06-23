#!/usr/bin/env node
/**
 * Creates the attendance + attendance_uploads tables when missing.
 * Safe to re-run — all SQL uses IF NOT EXISTS / DROP IF EXISTS.
 *
 * Usage:  node scripts/apply-attendance-upload-schema.mjs
 * npm:    npm run db:migrate-attendance-upload
 */
import "dotenv/config";
import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DB_URL, { max: 1 });

async function tableExists(name) {
  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS ready
  `;
  return row?.ready === true;
}

try {
  if (!(await tableExists("attendance"))) {
    console.log("Creating attendance table…");
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "attendance" (
        "id" serial PRIMARY KEY NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "total_records" integer NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT "attendance_total_records_chk" CHECK ("total_records" >= 0)
      );
      CREATE INDEX IF NOT EXISTS "idx_attendance_created_at"
        ON "attendance" ("created_at");
    `);
    console.log("attendance table created.");
  } else {
    console.log("attendance table already exists.");
  }

  if (!(await tableExists("attendance_uploads"))) {
    console.log("Creating attendance_uploads table…");
    await sql.unsafe(`
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

      CREATE UNIQUE INDEX IF NOT EXISTS "attendance_uploads_emp_date_uidx"
        ON "attendance_uploads" ("employee_code", "attendance_date");

      CREATE INDEX IF NOT EXISTS "idx_att_upload_attendance_id"
        ON "attendance_uploads" ("attendance_id");

      CREATE INDEX IF NOT EXISTS "idx_att_upload_date"
        ON "attendance_uploads" ("attendance_date");
    `);
    console.log("attendance_uploads table created.");
  } else {
    console.log("attendance_uploads table already exists.");

    // Ensure the global unique index exists (drop the old per-batch one if present).
    await sql.unsafe(`
      DROP INDEX IF EXISTS "attendance_uploads_batch_emp_date_uidx";
      CREATE UNIQUE INDEX IF NOT EXISTS "attendance_uploads_emp_date_uidx"
        ON "attendance_uploads" ("employee_code", "attendance_date");
    `);
    console.log("attendance_uploads unique index verified.");
  }

  console.log("Attendance upload schema migration complete.");
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
