ALTER TABLE "invitations" DROP CONSTRAINT "invitations_organization_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_organization_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_active_organization_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "organization_domains" DROP CONSTRAINT "organization_domains_tenant_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "organization_join_requests" DROP CONSTRAINT "organization_join_requests_tenant_id_organizations_id_fkey";--> statement-breakpoint
ALTER TABLE "organization_join_requests" DROP CONSTRAINT "organization_join_requests_invitation_tenant_fk";--> statement-breakpoint
DROP TABLE "apikeys";--> statement-breakpoint
DROP TABLE "invitations";--> statement-breakpoint
DROP TABLE "members";--> statement-breakpoint
DROP TABLE "organizations";--> statement-breakpoint
DROP TABLE "sessions";--> statement-breakpoint
DROP TABLE "two_factors";--> statement-breakpoint
DROP TABLE "verifications";--> statement-breakpoint
DROP TABLE "organization_domains";--> statement-breakpoint
DROP TABLE "organization_join_requests";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_key";--> statement-breakpoint
DROP INDEX "accounts_user_id_idx";--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "access_token";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "refresh_token";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "id_token";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "access_token_expires_at";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "refresh_token_expires_at";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "banned";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "ban_reason";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "ban_expires";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "two_factor_enabled";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_provider_uidx" ON "accounts" ("user_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" ("email");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
DROP TYPE "organization_join_request_status";