ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS onboarding_bank_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_bank_approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL;
