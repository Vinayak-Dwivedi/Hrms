-- On-behalf onboarding audit actions (admin/HR saving employee profile)

ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'ONBOARDING_PROFILE_UPDATED_ON_BEHALF';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'ONBOARDING_SUBMITTED_ON_BEHALF';
