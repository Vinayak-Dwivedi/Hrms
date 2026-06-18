ALTER TABLE "approval_workflows"
  ADD COLUMN IF NOT EXISTS "scope" jsonb NOT NULL DEFAULT '[]'::jsonb;
