-- Catchup: add user_id column to employees table.
-- Links an employee row to their auth users record.
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "user_id" text
    REFERENCES "users"("id") ON DELETE SET NULL;
