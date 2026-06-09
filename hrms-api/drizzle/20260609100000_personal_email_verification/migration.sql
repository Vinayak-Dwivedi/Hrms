ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "personal_email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "personal_email_verified_at" timestamptz;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verification_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"target_email" text NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamptz NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"attempt_count" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "email_verification_otps" ADD CONSTRAINT "email_verification_otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verification_otps_user_created_idx" ON "email_verification_otps" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_verification_otps_active_idx" ON "email_verification_otps" USING btree ("user_id","is_used","expires_at");
