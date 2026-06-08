DO $$ BEGIN
  ALTER TABLE "invitations" DROP CONSTRAINT "invitations_organization_id_organizations_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "members" DROP CONSTRAINT "members_organization_id_organizations_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sessions" DROP CONSTRAINT "sessions_active_organization_id_organizations_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_domains" DROP CONSTRAINT "organization_domains_tenant_id_organizations_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_join_requests" DROP CONSTRAINT "organization_join_requests_tenant_id_organizations_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_join_requests" DROP CONSTRAINT "organization_join_requests_invitation_tenant_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "apikeys";--> statement-breakpoint
DROP TABLE IF EXISTS "invitations";--> statement-breakpoint
DROP TABLE IF EXISTS "members";--> statement-breakpoint
DROP TABLE IF EXISTS "organizations";--> statement-breakpoint
DROP TABLE IF EXISTS "sessions";--> statement-breakpoint
DROP TABLE IF EXISTS "two_factors";--> statement-breakpoint
DROP TABLE IF EXISTS "verifications";--> statement-breakpoint
DROP TABLE IF EXISTS "organization_domains";--> statement-breakpoint
DROP TABLE IF EXISTS "organization_join_requests";--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" DROP CONSTRAINT "users_email_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DROP INDEX IF EXISTS "accounts_user_id_idx";--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "access_token";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "refresh_token";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "id_token";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "access_token_expires_at";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "refresh_token_expires_at";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "scope";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "banned";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "ban_reason";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "ban_expires";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "two_factor_enabled";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_user_provider_uidx" ON "accounts" ("user_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_uidx" ON "users" ("email");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DROP TYPE IF EXISTS "organization_join_request_status";
