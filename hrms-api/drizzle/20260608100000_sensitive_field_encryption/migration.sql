-- Sensitive employee field encryption: widen ciphertext columns, add blind-index hashes,
-- drop format CHECK constraints, move uniqueness to hash columns.
-- Run scripts/migrate-encrypt-sensitive-fields.mjs after this migration to encrypt existing plaintext.

ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "emp_pan_chk";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "emp_aadhaar_chk";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_pan_no_key";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_aadhaar_no_key";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_uan_no_key";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_esic_no_key";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "pan_no" TYPE text USING "pan_no"::text;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "aadhaar_no" TYPE text USING "aadhaar_no"::text;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "uan_no" TYPE text USING "uan_no"::text;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "esic_no" TYPE text USING "esic_no"::text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pan_no_hash" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "aadhaar_no_hash" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "uan_no_hash" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "esic_no_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employees_pan_no_hash_key" ON "employees" ("pan_no_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employees_aadhaar_no_hash_key" ON "employees" ("aadhaar_no_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employees_uan_no_hash_key" ON "employees" ("uan_no_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employees_esic_no_hash_key" ON "employees" ("esic_no_hash");--> statement-breakpoint
ALTER TABLE "employee_identity_details" ALTER COLUMN "pan_number" TYPE text USING "pan_number"::text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ALTER COLUMN "aadhaar_number" TYPE text USING "aadhaar_number"::text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ALTER COLUMN "passport_number" TYPE text USING "passport_number"::text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ALTER COLUMN "uan_number" TYPE text USING "uan_number"::text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ALTER COLUMN "esic_number" TYPE text USING "esic_number"::text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ADD COLUMN IF NOT EXISTS "pan_number_hash" text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ADD COLUMN IF NOT EXISTS "aadhaar_number_hash" text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ADD COLUMN IF NOT EXISTS "passport_number_hash" text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ADD COLUMN IF NOT EXISTS "uan_number_hash" text;--> statement-breakpoint
ALTER TABLE "employee_identity_details" ADD COLUMN IF NOT EXISTS "esic_number_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_identity_details_pan_number_hash_key" ON "employee_identity_details" ("pan_number_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_identity_details_aadhaar_number_hash_key" ON "employee_identity_details" ("aadhaar_number_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_identity_details_uan_number_hash_key" ON "employee_identity_details" ("uan_number_hash");--> statement-breakpoint
ALTER TABLE "employee_bank_details" DROP CONSTRAINT IF EXISTS "employee_bank_details_employee_account_uq";--> statement-breakpoint
ALTER TABLE "employee_bank_details" ALTER COLUMN "account_number" TYPE text USING "account_number"::text;--> statement-breakpoint
ALTER TABLE "employee_bank_details" ADD COLUMN IF NOT EXISTS "account_number_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_bank_details_employee_account_uq" ON "employee_bank_details" ("employee_id", "account_number_hash");
