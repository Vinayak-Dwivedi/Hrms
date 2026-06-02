CREATE TYPE "action_type_enum" AS ENUM('Promotion', 'Demotion', 'Transfer');--> statement-breakpoint
CREATE TYPE "att_status_enum" AS ENUM('Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Weekend');--> statement-breakpoint
CREATE TYPE "broadcast_target_enum" AS ENUM('all', 'department', 'individual');--> statement-breakpoint
CREATE TYPE "day_type_enum" AS ENUM('Full', 'Half', 'Off');--> statement-breakpoint
CREATE TYPE "document_status_enum" AS ENUM('Pending', 'Uploaded', 'Verified', 'Rejected');--> statement-breakpoint
CREATE TYPE "document_type_enum" AS ENUM('Offer Letter', 'Appointment Letter', 'Aadhaar Card', 'PAN Card', 'Educational Certificates', 'Profile Photo', 'Pay Slip');--> statement-breakpoint
CREATE TYPE "duration_type_enum" AS ENUM('Full Day', 'First Half', 'Second Half');--> statement-breakpoint
CREATE TYPE "employee_status_enum" AS ENUM('Active', 'Inactive', 'Probation', 'Notice', 'Exited');--> statement-breakpoint
CREATE TYPE "encashment_status_enum" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "gender_enum" AS ENUM('Male', 'Female', 'Other');--> statement-breakpoint
CREATE TYPE "holiday_type_enum" AS ENUM('National', 'Regional', 'Optional');--> statement-breakpoint
CREATE TYPE "hr_decision_enum" AS ENUM('Pending', 'Approved', 'Rejected', 'Override');--> statement-breakpoint
CREATE TYPE "leave_decision_enum" AS ENUM('Pending', 'Approved', 'Rejected', 'Forwarded');--> statement-breakpoint
CREATE TYPE "leave_req_status_enum" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Forwarded');--> statement-breakpoint
CREATE TYPE "marital_status_enum" AS ENUM('Single', 'Married');--> statement-breakpoint
CREATE TYPE "notif_kind_enum" AS ENUM('leave', 'team', 'hr', 'holiday', 'event');--> statement-breakpoint
CREATE TYPE "payroll_status_enum" AS ENUM('Active', 'Hold', 'Closed');--> statement-breakpoint
CREATE TYPE "perf_label_enum" AS ENUM('Good', 'Excellent', 'Needs Attention');--> statement-breakpoint
CREATE TYPE "regularise_status_enum" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "resignation_status_enum" AS ENUM('Pending', 'Approved', 'Withdrawn');--> statement-breakpoint
CREATE TYPE "transfer_status_enum" AS ENUM('Pending', 'Approved');--> statement-breakpoint
CREATE TYPE "organization_join_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikeys" (
	"id" text PRIMARY KEY,
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"reference_id" text NOT NULL,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" text PRIMARY KEY,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"two_factor_enabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"employee_id" integer,
	"date" date,
	"punch_in" time,
	"punch_out" time,
	"working_minutes" integer,
	"late_by_minutes" integer DEFAULT 0 NOT NULL,
	"early_exit_minutes" integer DEFAULT 0 NOT NULL,
	"status" "att_status_enum" NOT NULL,
	"location" varchar(200),
	"is_regularised" boolean DEFAULT false NOT NULL,
	"regularisation_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_records_pkey" PRIMARY KEY("employee_id","date"),
	CONSTRAINT "att_working_minutes_chk" CHECK ("working_minutes" IS NULL OR "working_minutes" >= 0),
	CONSTRAINT "att_late_minutes_chk" CHECK ("late_by_minutes" >= 0),
	CONSTRAINT "att_early_minutes_chk" CHECK ("early_exit_minutes" >= 0),
	CONSTRAINT "att_punch_out_after_in_chk" CHECK ("punch_out" IS NULL OR "punch_out" > "punch_in")
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"employee_id" integer,
	"account_number" varchar(25),
	"account_name" varchar(100) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"branch_name" varchar(100) NOT NULL,
	"ifsc_code" varchar(11) NOT NULL,
	"passbook_url" varchar(500),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_accounts_pkey" PRIMARY KEY("employee_id","account_number"),
	CONSTRAINT "bank_ifsc_chk" CHECK ("ifsc_code" ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"address" text,
	"headcount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_headcount_chk" CHECK ("headcount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" serial PRIMARY KEY,
	"sender_id" integer NOT NULL,
	"target_type" "broadcast_target_enum" NOT NULL,
	"message" text NOT NULL,
	"target_dept_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"target_emp_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bc_dept_ids_when_dept_chk" CHECK ("target_type" <> 'department' OR array_length("target_dept_ids", 1) > 0),
	CONSTRAINT "bc_emp_ids_when_individual_chk" CHECK ("target_type" <> 'individual' OR array_length("target_emp_ids", 1) > 0),
	CONSTRAINT "bc_all_no_ids_chk" CHECK ("target_type" <> 'all' OR (array_length("target_dept_ids", 1) IS NULL AND array_length("target_emp_ids", 1) IS NULL))
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"manager_id" integer,
	"location_area" varchar(200),
	"headcount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dept_headcount_chk" CHECK ("headcount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "designations" (
	"id" serial PRIMARY KEY,
	"name" varchar(150) NOT NULL UNIQUE,
	"department_id" integer,
	"grade_min_id" integer,
	"grade_max_id" integer,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "designation_emp_count_chk" CHECK ("employee_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"employee_id" integer,
	"document_type" "document_type_enum",
	"document_urls" varchar(500)[] DEFAULT '{}'::varchar(500)[] NOT NULL,
	"status" "document_status_enum" DEFAULT 'Uploaded'::"document_status_enum" NOT NULL,
	"verified_by" integer,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_documents_pkey" PRIMARY KEY("employee_id","document_type"),
	CONSTRAINT "doc_verified_at_requires_by_chk" CHECK ("verified_at" IS NULL OR "verified_by" IS NOT NULL),
	CONSTRAINT "doc_urls_not_empty_chk" CHECK ("status" = 'Pending' OR array_length("document_urls", 1) > 0)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY,
	"emp_id" varchar(20) NOT NULL UNIQUE,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"personal_email" citext NOT NULL UNIQUE,
	"work_email" citext UNIQUE,
	"phone" varchar(20) NOT NULL,
	"dob" date NOT NULL,
	"gender" "gender_enum" NOT NULL,
	"blood_group" varchar(5),
	"nationality" varchar(50) DEFAULT 'Indian' NOT NULL,
	"marital_status" "marital_status_enum",
	"spouse_name" varchar(200),
	"father_name" varchar(200),
	"mother_name" varchar(200),
	"current_address" text,
	"permanent_address" text,
	"emergency_contact_name" varchar(200),
	"emergency_contact_phone" varchar(20),
	"pan_no" varchar(15) UNIQUE,
	"uan_no" varchar(20) UNIQUE,
	"aadhaar_no" varchar(12) UNIQUE,
	"esic_no" varchar(20) UNIQUE,
	"linkedin_url" varchar(255),
	"profile_photo_url" varchar(500),
	"reporting_chain" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"department_id" integer,
	"designation_id" integer,
	"grade_id" integer,
	"branch_id" integer,
	"employment_type_id" integer,
	"reporting_manager_id" integer,
	"joining_date" date NOT NULL,
	"date_of_exit" date,
	"employee_status" "employee_status_enum" DEFAULT 'Active'::"employee_status_enum" NOT NULL,
	"payroll_status" "payroll_status_enum" DEFAULT 'Active'::"payroll_status_enum" NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emp_phone_chk" CHECK ("phone" ~ '^\+?[0-9]{7,15}$'),
	CONSTRAINT "emp_emergency_phone_chk" CHECK ("emergency_contact_phone" IS NULL OR "emergency_contact_phone" ~ '^\+?[0-9]{7,15}$'),
	CONSTRAINT "emp_dob_18yrs_chk" CHECK ("dob" <= CURRENT_DATE - INTERVAL '18 years'),
	CONSTRAINT "emp_pan_chk" CHECK ("pan_no" IS NULL OR "pan_no" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
	CONSTRAINT "emp_aadhaar_chk" CHECK ("aadhaar_no" IS NULL OR "aadhaar_no" ~ '^[0-9]{12}$'),
	CONSTRAINT "emp_exit_after_join_chk" CHECK ("date_of_exit" IS NULL OR "date_of_exit" >= "joining_date"),
	CONSTRAINT "emp_no_self_manager_chk" CHECK ("reporting_manager_id" <> "id"),
	CONSTRAINT "emp_spouse_when_married_chk" CHECK ("marital_status" <> 'Married' OR "spouse_name" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "employment_types" (
	"id" serial PRIMARY KEY,
	"name" varchar(50) NOT NULL UNIQUE,
	"notice_period_days" integer,
	"active_employee_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emp_type_notice_period_chk" CHECK ("notice_period_days" IS NULL OR "notice_period_days" >= 0),
	CONSTRAINT "emp_type_active_count_chk" CHECK ("active_employee_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY,
	"code" varchar(5) NOT NULL UNIQUE,
	"band_name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"employee_id" integer,
	"leave_type_id" integer,
	"opening_balance" numeric(6,2) DEFAULT '0' NOT NULL,
	"accrued" numeric(6,2) DEFAULT '0' NOT NULL,
	"used" numeric(6,2) DEFAULT '0' NOT NULL,
	"carried_forward" numeric(6,2) DEFAULT '0' NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL,
	"closing_balance" numeric(6,2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_balances_pkey" PRIMARY KEY("employee_id","leave_type_id"),
	CONSTRAINT "lb_closing_balance_chk" CHECK ("closing_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"days" numeric(4,1) NOT NULL,
	"duration_type" "duration_type_enum" NOT NULL,
	"reason" text NOT NULL,
	"document_urls" varchar(500)[] DEFAULT '{}'::varchar(500)[] NOT NULL,
	"status" "leave_req_status_enum" DEFAULT 'Pending'::"leave_req_status_enum" NOT NULL,
	"applied_on" date DEFAULT CURRENT_DATE NOT NULL,
	"manager_id" integer,
	"manager_decision" "leave_decision_enum",
	"manager_decided_at" timestamp with time zone,
	"manager_remarks" text,
	"hr_id" integer,
	"hr_decision" "hr_decision_enum",
	"hr_decided_at" timestamp with time zone,
	"hr_remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lr_days_chk" CHECK ("days" > 0),
	CONSTRAINT "lr_to_after_from_chk" CHECK ("to_date" >= "from_date"),
	CONSTRAINT "lr_applied_date_chk" CHECK ("applied_on" <= CURRENT_DATE),
	CONSTRAINT "lr_half_day_chk" CHECK ("duration_type" = 'Full Day' OR "days" = 0.5)
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"code" varchar(5) NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY,
	"recipient_id" integer NOT NULL,
	"kind" "notif_kind_enum" NOT NULL,
	"title" varchar(255) NOT NULL,
	"sub" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regularisation_requests" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"original_issue" varchar(255),
	"requested_punch_in" time NOT NULL,
	"requested_punch_out" time NOT NULL,
	"reason" text NOT NULL,
	"proof_document_urls" varchar(500)[] DEFAULT '{}'::varchar(500)[] NOT NULL,
	"status" "regularise_status_enum" DEFAULT 'Pending'::"regularise_status_enum" NOT NULL,
	"approver_id" integer,
	"approver_remarks" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reg_punch_out_after_in_chk" CHECK ("requested_punch_out" > "requested_punch_in"),
	CONSTRAINT "reg_decided_needs_approver_chk" CHECK ("decided_at" IS NULL OR "approver_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "resignations" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"last_working_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" "resignation_status_enum" DEFAULT 'Pending'::"resignation_status_enum" NOT NULL,
	"submitted_on" date DEFAULT CURRENT_DATE NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resignation_lwd_future_chk" CHECK ("last_working_date" >= "submitted_on"),
	CONSTRAINT "resignation_approved_needs_approver_chk" CHECK ("approved_at" IS NULL OR "approved_by" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "organization_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" text NOT NULL,
	"domain" text NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"company_domain" text NOT NULL,
	"status" "organization_join_request_status" DEFAULT 'pending'::"organization_join_request_status" NOT NULL,
	"requester_user_id" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_invitation_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "apikeys_config_id_idx" ON "apikeys" ("config_id");--> statement-breakpoint
CREATE INDEX "apikeys_reference_id_idx" ON "apikeys" ("reference_id");--> statement-breakpoint
CREATE INDEX "apikeys_key_idx" ON "apikeys" ("key");--> statement-breakpoint
CREATE INDEX "invitations_organization_id_idx" ON "invitations" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_id_organization_id_uidx" ON "invitations" ("id","organization_id");--> statement-breakpoint
CREATE INDEX "members_organization_id_idx" ON "members" ("organization_id");--> statement-breakpoint
CREATE INDEX "members_user_id_idx" ON "members" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_organization_user_uidx" ON "members" ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" ("slug");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_active_organization_id_idx" ON "sessions" ("active_organization_id");--> statement-breakpoint
CREATE INDEX "two_factors_secret_idx" ON "two_factors" ("secret");--> statement-breakpoint
CREATE INDEX "two_factors_user_id_idx" ON "two_factors" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
CREATE INDEX "idx_att_date" ON "attendance_records" ("date");--> statement-breakpoint
CREATE INDEX "idx_att_status" ON "attendance_records" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_one_primary_bank_account" ON "bank_accounts" ("employee_id") WHERE "is_primary" = TRUE;--> statement-breakpoint
CREATE INDEX "idx_bc_dept_ids" ON "broadcasts" USING gin ("target_dept_ids");--> statement-breakpoint
CREATE INDEX "idx_bc_emp_ids" ON "broadcasts" USING gin ("target_emp_ids");--> statement-breakpoint
CREATE INDEX "idx_emp_dept" ON "employees" ("department_id");--> statement-breakpoint
CREATE INDEX "idx_emp_desig" ON "employees" ("designation_id");--> statement-breakpoint
CREATE INDEX "idx_emp_grade" ON "employees" ("grade_id");--> statement-breakpoint
CREATE INDEX "idx_emp_branch" ON "employees" ("branch_id");--> statement-breakpoint
CREATE INDEX "idx_emp_emp_type" ON "employees" ("employment_type_id");--> statement-breakpoint
CREATE INDEX "idx_emp_manager" ON "employees" ("reporting_manager_id");--> statement-breakpoint
CREATE INDEX "idx_emp_status" ON "employees" ("employee_status");--> statement-breakpoint
CREATE INDEX "idx_emp_join_date" ON "employees" ("joining_date");--> statement-breakpoint
CREATE INDEX "idx_emp_reporting_chain" ON "employees" USING gin ("reporting_chain");--> statement-breakpoint
CREATE INDEX "idx_lr_emp" ON "leave_requests" ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_lr_status" ON "leave_requests" ("status");--> statement-breakpoint
CREATE INDEX "idx_lr_dates" ON "leave_requests" ("from_date","to_date");--> statement-breakpoint
CREATE INDEX "idx_notif_recipient" ON "notifications" ("recipient_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notif_created" ON "notifications" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "organization_domains_tenant_id_idx" ON "organization_domains" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_domains_domain_uidx" ON "organization_domains" ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_domains_tenant_domain_uidx" ON "organization_domains" ("tenant_id","domain");--> statement-breakpoint
CREATE INDEX "organization_join_requests_tenant_status_idx" ON "organization_join_requests" ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "organization_join_requests_email_idx" ON "organization_join_requests" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_join_requests_pending_email_uidx" ON "organization_join_requests" ("tenant_id","email") WHERE "status" = 'pending';--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_organization_id_organizations_id_fkey" FOREIGN KEY ("active_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_impersonated_by_users_id_fkey" FOREIGN KEY ("impersonated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_y7vNYPKIyPGV_fkey" FOREIGN KEY ("regularisation_id") REFERENCES "regularisation_requests"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_sender_id_employees_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "employees"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_employees_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_department_id_departments_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_grade_min_id_grades_id_fkey" FOREIGN KEY ("grade_min_id") REFERENCES "grades"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_grade_max_id_grades_id_fkey" FOREIGN KEY ("grade_max_id") REFERENCES "grades"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_verified_by_employees_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_designations_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_grade_id_grades_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_employment_type_id_employment_types_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_reporting_manager_id_employees_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_manager_id_employees_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_hr_id_employees_id_fkey" FOREIGN KEY ("hr_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_employees_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "regularisation_requests" ADD CONSTRAINT "regularisation_requests_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "regularisation_requests" ADD CONSTRAINT "regularisation_requests_approver_id_employees_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_approved_by_employees_id_fkey" FOREIGN KEY ("approved_by") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "organization_domains" ADD CONSTRAINT "organization_domains_tenant_id_organizations_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_join_requests" ADD CONSTRAINT "organization_join_requests_tenant_id_organizations_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "organization_join_requests" ADD CONSTRAINT "organization_join_requests_requester_user_id_users_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "organization_join_requests" ADD CONSTRAINT "organization_join_requests_reviewed_by_user_id_users_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "organization_join_requests" ADD CONSTRAINT "organization_join_requests_invitation_tenant_fk" FOREIGN KEY ("created_invitation_id","tenant_id") REFERENCES "invitations"("id","organization_id");