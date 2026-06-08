-- Phase 3: admin onboarding status, audit logs, token history, document rejection

CREATE TYPE "onboarding_status_enum_v3" AS ENUM('PENDING', 'INVITATION_SENT', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "token_issue_reason_enum" AS ENUM('CREATE', 'RESEND', 'REGENERATE', 'INVALIDATE');--> statement-breakpoint
CREATE TYPE "audit_entity_type_enum" AS ENUM('employee', 'document', 'invitation', 'auth');--> statement-breakpoint
CREATE TYPE "audit_action_enum" AS ENUM(
  'EMPLOYEE_CREATED',
  'INVITATION_SENT',
  'INVITATION_RESENT',
  'INVITATION_REGENERATED',
  'INVITATION_INVALIDATED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'PROFILE_UPDATED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_DELETED',
  'DOCUMENT_VERIFIED',
  'DOCUMENT_REJECTED',
  'ONBOARDING_SUBMITTED',
  'ONBOARDING_COMPLETED'
);--> statement-breakpoint

ALTER TABLE "employees" ALTER COLUMN "onboarding_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "onboarding_status" TYPE "onboarding_status_enum_v3" USING (
  CASE "onboarding_status"::text
    WHEN 'NOT_STARTED' THEN 'PENDING'
    WHEN 'SUBMITTED' THEN 'IN_PROGRESS'
    WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
    WHEN 'COMPLETED' THEN 'COMPLETED'
    ELSE 'PENDING'
  END::"onboarding_status_enum_v3"
);--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "onboarding_status" SET DEFAULT 'PENDING';--> statement-breakpoint
DROP TYPE "onboarding_status_enum";--> statement-breakpoint
ALTER TYPE "onboarding_status_enum_v3" RENAME TO "onboarding_status_enum";--> statement-breakpoint

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_submitted_at" timestamptz;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_reviewed_at" timestamptz;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_review_notes" text;--> statement-breakpoint

ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "rejected_by" integer;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "rejected_at" timestamptz;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD COLUMN IF NOT EXISTS "rejection_reason" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "employee_onboarding_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" integer NOT NULL,
  "token_hash" varchar(128) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "invalidated_at" timestamptz,
  "issued_by" text,
  "issue_reason" "token_issue_reason_enum" NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_onboarding_tokens_employee" ON "employee_onboarding_tokens" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_onboarding_tokens_hash" ON "employee_onboarding_tokens" ("token_hash");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "actor_user_id" text,
  "actor_employee_id" integer,
  "action" "audit_action_enum" NOT NULL,
  "entity_type" "audit_entity_type_enum" NOT NULL,
  "entity_id" varchar(100) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_audit_entity" ON "audit_logs" ("entity_type", "entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "audit_logs" ("actor_user_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "audit_logs" ("action", "created_at");--> statement-breakpoint

ALTER TABLE "employees" ADD CONSTRAINT "employees_onboarding_reviewed_by_fkey" FOREIGN KEY ("onboarding_reviewed_by") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employee_onboarding_tokens" ADD CONSTRAINT "employee_onboarding_tokens_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
