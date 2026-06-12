-- Leave credit transactions: append-only ledger of every adjustment to an
-- employee's leave balance — automated accruals/grants, year-end carry
-- forwards, lapses, manual adjustments, and encashment debits.
--
-- The closing_balance on leave_balances is the running total; this table
-- explains how it got there.
--
-- Idempotency: Accrual/Grant kinds use a partial unique index so the engine
-- can be re-run for the same period without doubling balances. Other kinds
-- can repeat (e.g. multiple manual adjustments in the same month).

CREATE TABLE IF NOT EXISTS "leave_credit_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "leave_type_id" integer NOT NULL REFERENCES "leave_types"("id") ON DELETE CASCADE,
  "policy_id" integer REFERENCES "leave_policies"("id") ON DELETE SET NULL,
  "amount" numeric(6, 2) NOT NULL,
  -- 'Accrual' | 'Grant' | 'Adjustment' | 'CarryForward' | 'Lapse' | 'Encashment'
  "kind" varchar(20) NOT NULL,
  -- 'YYYY-MM' for monthly accruals, 'YYYY-01' for yearly grants, free-form
  -- for adjustments.
  "period" varchar(7) NOT NULL,
  "reason" text,
  "actor_user_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_leave_credit_tx_emp"
  ON "leave_credit_transactions" ("employee_id", "created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_leave_credit_tx_period"
  ON "leave_credit_transactions" ("period", "kind");--> statement-breakpoint

-- Idempotency guard: only one auto-credit per (employee, type, period, kind).
-- Adjustments/CarryForward/Lapse/Encashment can repeat.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_leave_credit_tx_auto_dedup"
  ON "leave_credit_transactions" ("employee_id", "leave_type_id", "period", "kind")
  WHERE "kind" IN ('Accrual', 'Grant');
