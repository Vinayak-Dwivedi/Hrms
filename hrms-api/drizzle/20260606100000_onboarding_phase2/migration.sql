-- Phase 2: onboarding profile tables, per-file documents, onboarding_status

CREATE TYPE "onboarding_status_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED');--> statement-breakpoint

ALTER TYPE "document_type_enum" ADD VALUE IF NOT EXISTS 'Resume';--> statement-breakpoint
ALTER TYPE "document_type_enum" ADD VALUE IF NOT EXISTS 'Academic Certificates';--> statement-breakpoint
ALTER TYPE "document_type_enum" ADD VALUE IF NOT EXISTS 'Experience Letter';--> statement-breakpoint
ALTER TYPE "document_type_enum" ADD VALUE IF NOT EXISTS 'Relieving Letter';--> statement-breakpoint
ALTER TYPE "document_type_enum" ADD VALUE IF NOT EXISTS 'Salary Slip';--> statement-breakpoint
ALTER TYPE "document_type_enum" ADD VALUE IF NOT EXISTS 'Passport';--> statement-breakpoint

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_status" "onboarding_status_enum" NOT NULL DEFAULT 'NOT_STARTED';--> statement-breakpoint

UPDATE "employees"
SET "onboarding_status" = 'COMPLETED'
WHERE "onboarding_completed_at" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_academic_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"qualification" varchar(100) NOT NULL,
	"institution" varchar(200) NOT NULL,
	"board_university" varchar(200),
	"field_of_study" varchar(100),
	"year_from" smallint,
	"year_to" smallint,
	"grade_or_percentage" varchar(20),
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_professional_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"designation" varchar(100) NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"responsibilities" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_identity_details" (
	"employee_id" integer PRIMARY KEY NOT NULL,
	"pan_number" varchar(15),
	"aadhaar_number" varchar(12),
	"passport_number" varchar(20),
	"passport_expiry" date,
	"uan_number" varchar(20),
	"esic_number" varchar(20),
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" integer NOT NULL,
	"document_type" "document_type_enum" NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"stored_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"status" "document_status_enum" DEFAULT 'Uploaded' NOT NULL,
	"verified_by" integer,
	"verified_at" timestamptz,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "employee_documents_size_bytes_chk" CHECK ("size_bytes" >= 0)
);

CREATE INDEX IF NOT EXISTS "idx_employee_documents_employee_id" ON "employee_documents" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_employee_documents_type" ON "employee_documents" ("employee_id", "document_type");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_bank_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"account_number" varchar(25) NOT NULL,
	"account_name" varchar(100) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"ifsc_code" varchar(11) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"passbook_document_id" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "employee_bank_details_employee_account_uq" UNIQUE("employee_id", "account_number")
);--> statement-breakpoint

INSERT INTO "employee_bank_details" (
	"employee_id",
	"account_number",
	"account_name",
	"bank_name",
	"branch_name",
	"ifsc_code",
	"is_primary",
	"created_at"
)
SELECT
	"employee_id",
	"account_number",
	"account_name",
	"bank_name",
	"branch_name",
	"ifsc_code",
	"is_primary",
	"created_at"
FROM "bank_accounts"
ON CONFLICT DO NOTHING;--> statement-breakpoint

ALTER TABLE "employee_academic_details" ADD CONSTRAINT "employee_academic_details_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "employee_professional_details" ADD CONSTRAINT "employee_professional_details_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ADD CONSTRAINT "employee_identity_details_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_verified_by_employees_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employee_bank_details" ADD CONSTRAINT "employee_bank_details_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "employee_bank_details" ADD CONSTRAINT "employee_bank_details_passbook_document_id_fkey" FOREIGN KEY ("passbook_document_id") REFERENCES "employee_documents"("id") ON DELETE SET NULL;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_one_primary_bank_detail" ON "employee_bank_details" ("employee_id") WHERE "is_primary" = TRUE;--> statement-breakpoint
