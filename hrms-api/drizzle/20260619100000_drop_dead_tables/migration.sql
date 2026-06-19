-- Drop dead/unused tables. Idempotent.
--   bank_accounts — zero queries; superseded by employee_bank_details.
--   broadcasts    — stub (CRUD mount only, no feature/UI).
DROP TABLE IF EXISTS "bank_accounts";
DROP TABLE IF EXISTS "broadcasts";
