-- ────────────────────────────────────────────────────────────────────────
-- Leave Policy persistence (Pass 1).
--
-- Three tables:
--   1. leave_policies        — one row per HR-defined policy (header + JSON settings)
--   2. leave_policy_scope    — which employees this policy applies to
--                              (Company / Branch / Department / Designation /
--                              Grade / EmploymentType / Employee — by specificity)
--   3. leave_approval_workflows — what to do when a leave request fires the
--                              policy (auto-approve / auto-reject / route +
--                              email recipients + template)
--
-- Scope resolution at read time:
--   Given an employee + leave_type_id, find all matching policy_scope rows,
--   sort by (specificity DESC, priority ASC), pick the winner's policy.
--   Specificity: Employee=7 > Designation=6 > Grade=5 > Process=4 >
--                Department=3 > Branch=2 > EmploymentType=1 > Company=0.
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "leave_policies" (
  "id"             serial PRIMARY KEY,
  "leave_type_id"  integer NOT NULL REFERENCES "leave_types"("id") ON DELETE CASCADE,
  "name"           varchar(150) NOT NULL,
  "description"    text,
  "status"         varchar(20) NOT NULL DEFAULT 'Active',
  "is_default"     boolean NOT NULL DEFAULT false,
  -- JSON blob holding all the toggles/numbers for this leave_type's policy.
  -- Shape is leave-type-specific and validated by the API layer's Zod schema.
  -- e.g. for Comp Off: { allowFullDay, allowHalfDay, allowQuarterDay,
  --                      allowHourly, allowFuture, includeTime, requireReason,
  --                      manualRequest, weekendUnits, holidayUnits,
  --                      expiryMode, expiryDays }
  "settings"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by"     integer REFERENCES "employees"("id") ON DELETE SET NULL,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "leave_policies_status_chk"
    CHECK ("status" IN ('Draft', 'Active', 'Archived'))
);

-- Only one default policy per leave_type. The partial unique index lets us
-- enforce that without blocking multiple non-default policies.
CREATE UNIQUE INDEX IF NOT EXISTS "leave_policies_default_per_type_uidx"
  ON "leave_policies" ("leave_type_id")
  WHERE "is_default" = true;

CREATE INDEX IF NOT EXISTS "leave_policies_leave_type_idx"
  ON "leave_policies" ("leave_type_id");

-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "leave_policy_scope" (
  "id"          serial PRIMARY KEY,
  "policy_id"   integer NOT NULL REFERENCES "leave_policies"("id") ON DELETE CASCADE,
  "scope_type"  varchar(30) NOT NULL,
  -- NULL when scope_type='Company'; FK to the matching lookup table otherwise.
  -- We don't enforce FKs here because scope_id points at different tables
  -- depending on scope_type — the API layer validates it.
  "scope_id"    integer,
  "priority"    integer NOT NULL DEFAULT 100,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "leave_policy_scope_type_chk"
    CHECK ("scope_type" IN (
      'Company','Branch','Department','Designation','Grade',
      'EmploymentType','Process','Employee'
    )),
  CONSTRAINT "leave_policy_scope_id_required_chk"
    CHECK (
      ("scope_type" = 'Company' AND "scope_id" IS NULL) OR
      ("scope_type" <> 'Company' AND "scope_id" IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS "leave_policy_scope_policy_idx"
  ON "leave_policy_scope" ("policy_id");
CREATE INDEX IF NOT EXISTS "leave_policy_scope_type_id_idx"
  ON "leave_policy_scope" ("scope_type", "scope_id");

-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "leave_approval_workflows" (
  "id"          serial PRIMARY KEY,
  "policy_id"   integer NOT NULL REFERENCES "leave_policies"("id") ON DELETE CASCADE,
  "name"        varchar(150) NOT NULL,
  "description" text,
  -- Array of { field, operator, value } — evaluated against the leave request.
  -- e.g. [{ field: 'Leave Type', operator: 'is', value: 'Casual Leave' }]
  "criteria"    jsonb NOT NULL DEFAULT '[]'::jsonb,
  "outcome"     varchar(20) NOT NULL,
  "from_mode"   varchar(80) NOT NULL DEFAULT 'Person performing this action',
  "to_recipients"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "cc_recipients"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  "bcc_recipients"       jsonb NOT NULL DEFAULT '[]'::jsonb,
  "reply_to_recipients"  jsonb NOT NULL DEFAULT '[]'::jsonb,
  "subject"     text NOT NULL DEFAULT '',
  "body"        text NOT NULL DEFAULT '',
  "is_active"   boolean NOT NULL DEFAULT true,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "leave_approval_workflows_outcome_chk"
    CHECK ("outcome" IN ('AutoApprove', 'AutoReject', 'Route'))
);

CREATE INDEX IF NOT EXISTS "leave_approval_workflows_policy_idx"
  ON "leave_approval_workflows" ("policy_id");
