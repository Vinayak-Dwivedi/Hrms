-- M5 — Approval routing. Adds the audit action values for the leave
-- lifecycle so writeAuditLog can record each transition, and adds the
-- 'leave_request' entity type.
--
-- New action labels follow the existing convention (UPPER_SNAKE_CASE).

ALTER TYPE "audit_entity_type_enum" ADD VALUE IF NOT EXISTS 'leave_request';--> statement-breakpoint

ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_SUBMITTED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_AUTO_APPROVED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_AUTO_REJECTED';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_APPROVED_BY_MANAGER';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_REJECTED_BY_MANAGER';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_FORWARDED_BY_MANAGER';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_APPROVED_BY_HR';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_REJECTED_BY_HR';--> statement-breakpoint
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'LEAVE_CANCELLED';
