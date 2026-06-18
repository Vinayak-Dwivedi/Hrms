-- Add the RESIGNATION_RESUMED audit action (HR lifting a hold). Idempotent.
ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'RESIGNATION_RESUMED';
