ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_token" varchar(128);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_token_expiry" timestamptz;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_token_used" boolean NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamptz;

CREATE INDEX IF NOT EXISTS "idx_emp_onboarding_token" ON "employees" ("onboarding_token");
