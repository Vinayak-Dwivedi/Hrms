-- Idempotent admin user for HRMS full portal access.
-- Email: admin@iotindia.ai   Password: 12345678
--
-- Prerequisites: migrations applied; run `npm run seed:rbac` for non-admin roles.
--
-- Regenerate bcrypt hash (cost 10):
--   node -e "import('bcryptjs').then(b=>b.default.hash('12345678',10).then(console.log))"
--
-- Embedded hash for password "12345678":
--   $2a$10$BE8NPJ3iAexH1ACJw89r0.R.3oCGfcFiH/LMTKHPW/HeqR65di426

BEGIN;

-- ── Auth user (role = admin → full portal access) ─────────────────────────────
-- If `user_type_id` is missing on your DB, comment this block and use the
-- fallback INSERT at the bottom of this file instead.

INSERT INTO users (id, name, email, email_verified, role, user_type_id, created_at, updated_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'HR Admin',
  'admin@iotindia.ai',
  true,
  'admin',
  1,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = 'admin',
  user_type_id = 1,
  email_verified = true,
  updated_at = now();

-- ── Credential account (login password) ───────────────────────────────────────

INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT
  'a0000000-0000-4000-8000-000000000002',
  u.id,
  'credential',
  u.id,
  '$2a$10$BE8NPJ3iAexH1ACJw89r0.R.3oCGfcFiH/LMTKHPW/HeqR65di426',
  now(),
  now()
FROM users u
WHERE lower(u.email) = 'admin@iotindia.ai'
ON CONFLICT (user_id, provider_id) DO UPDATE SET
  password = EXCLUDED.password,
  updated_at = now();

-- ── Linked employee record (optional; enables emp-id login) ─────────────────

INSERT INTO employees (
  emp_id, first_name, last_name, personal_email, work_email,
  phone, dob, gender, nationality, joining_date, password_hash, user_id, employee_status
)
SELECT
  'IOT-0001',
  'HR',
  'Admin',
  'admin@iotindia.ai',
  'admin@iotindia.ai',
  '+919999000099',
  '1990-01-01'::date,
  'Other',
  'Indian',
  CURRENT_DATE,
  '$2a$04$zP2nwqMjj3rdxvFSgS/SCu0xJcZqj8NANsbmH1yneHTZawofg2Ezi',
  u.id,
  'Active'
FROM users u
WHERE lower(u.email) = 'admin@iotindia.ai'
ON CONFLICT (emp_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  personal_email = EXCLUDED.personal_email,
  work_email = EXCLUDED.work_email,
  phone = EXCLUDED.phone,
  user_id = EXCLUDED.user_id,
  employee_status = 'Active',
  updated_at = now();

UPDATE employees e
SET
  user_id = u.id,
  work_email = 'admin@iotindia.ai',
  personal_email = 'admin@iotindia.ai',
  employee_status = 'Active',
  updated_at = now()
FROM users u
WHERE lower(u.email) = 'admin@iotindia.ai'
  AND lower(e.work_email::text) = 'admin@iotindia.ai'
  AND (e.user_id IS DISTINCT FROM u.id OR e.work_email IS DISTINCT FROM 'admin@iotindia.ai');

COMMIT;

-- ── Fallback (older DBs without users.user_type_id) ─────────────────────────
-- BEGIN;
-- INSERT INTO users (id, name, email, email_verified, role, created_at, updated_at)
-- VALUES (
--   'a0000000-0000-4000-8000-000000000001',
--   'HR Admin',
--   'admin@iotindia.ai',
--   true,
--   'admin',
--   now(),
--   now()
-- )
-- ON CONFLICT (email) DO UPDATE SET
--   name = EXCLUDED.name,
--   role = 'admin',
--   email_verified = true,
--   updated_at = now();
-- -- then re-run the accounts + employees sections above
-- COMMIT;
