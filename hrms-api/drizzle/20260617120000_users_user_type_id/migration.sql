-- Catchup: add user_type_id column to users table.
-- Plain integer (no FK), default 4 = employee.
-- Existing rows get default 4; seed-admin will update admin row to 1.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "user_type_id" integer NOT NULL DEFAULT 4;
