-- Phase 1 extension of leave_types: capture per-type policy switches that
-- the application/validation engine in later milestones needs.
--
-- All flags default to "off" except allowed_in_probation, which defaults to
-- "true" so existing rows behave as before (no probation restriction).

ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "hourly_leave_allowed" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "carry_forward_allowed" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "encashment_allowed" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "attachment_required" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "allowed_in_probation" boolean NOT NULL DEFAULT true;
