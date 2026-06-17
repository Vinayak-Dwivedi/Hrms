-- Offboarding — manager "Request Discussion".
-- Adds the ManagerDiscussion status value (only ADDED here, never used in this
-- file) and a discussion_note column on resignations.

ALTER TYPE "resignation_status_enum" ADD VALUE IF NOT EXISTS 'ManagerDiscussion';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_DISCUSSION_REQUESTED';--> statement-breakpoint

ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "discussion_note" text;
