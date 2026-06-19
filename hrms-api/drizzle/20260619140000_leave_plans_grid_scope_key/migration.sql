-- Leave Policy grid: mark plans that are managed by the scope-first allocation
-- grid so they can be upserted by their org-scope identity rather than by name.
-- `grid_scope_key` encodes the composite leaf scope, e.g. "B2:D3:S5" (branch 2,
-- department 3, sub-department 5) or "B2:D3" (department leaf, no sub-dept).
-- A partial unique index guarantees one grid-managed plan per scope leaf while
-- leaving hand-authored (named) plans — which keep grid_scope_key NULL —
-- untouched. Idempotent.

ALTER TABLE "leave_plans"
  ADD COLUMN IF NOT EXISTS "grid_scope_key" varchar(40);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_plans_grid_scope_key_uq"
  ON "leave_plans" ("grid_scope_key")
  WHERE "grid_scope_key" IS NOT NULL;
