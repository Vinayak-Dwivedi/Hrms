ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_BUYOUT_DECISION';--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "buyout_status" varchar(20) DEFAULT 'None' NOT NULL;--> statement-breakpoint
ALTER TABLE "resignations" ADD COLUMN IF NOT EXISTS "buyout_decision_note" text;--> statement-breakpoint
UPDATE "resignations" SET "buyout_status" = 'Requested' WHERE "buyout_requested" = true AND "buyout_status" = 'None';
