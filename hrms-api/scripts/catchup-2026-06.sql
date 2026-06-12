-- Catch-up schema for the 2026-06 feature set (leave policies, comp-off,
-- approval workflows, sub-departments, leave credits, etc.).
-- Idempotent: safe to run on any DB (RDS or the EC2 box). Run with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f catchup-2026-06.sql
-- New tables come first; column additions to pre-existing tables follow.


\restrict hUe0g9vaUjd7hWjtNNDP5qHkPL6ZflGJAnFpal3BbC8N6wDmI7zChKO29C9FyE9
CREATE TABLE IF NOT EXISTS public.approval_workflows (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    stages jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.approval_workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.approval_workflows_id_seq OWNED BY public.approval_workflows.id;
CREATE TABLE IF NOT EXISTS public.comp_off_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    manager_id integer,
    worked_date date NOT NULL,
    days numeric(4,1) DEFAULT 1 NOT NULL,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    decided_by integer,
    decided_at timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.comp_off_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.comp_off_requests_id_seq OWNED BY public.comp_off_requests.id;
CREATE TABLE IF NOT EXISTS public.holiday_calendar_scope (
    id integer NOT NULL,
    calendar_id integer NOT NULL,
    scope_type character varying(30) NOT NULL,
    scope_id integer,
    priority integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.holiday_calendar_scope_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.holiday_calendar_scope_id_seq OWNED BY public.holiday_calendar_scope.id;
CREATE TABLE IF NOT EXISTS public.holiday_calendars (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'Draft'::character varying NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.holiday_calendars_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.holiday_calendars_id_seq OWNED BY public.holiday_calendars.id;
CREATE TABLE IF NOT EXISTS public.holiday_team_links (
    holiday_id integer NOT NULL,
    calendar_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.leave_approval_workflows (
    id integer NOT NULL,
    policy_id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    criteria jsonb DEFAULT '[]'::jsonb NOT NULL,
    outcome character varying(20) NOT NULL,
    from_mode character varying(80) DEFAULT 'Person performing this action'::character varying NOT NULL,
    to_recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    cc_recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    bcc_recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    reply_to_recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.leave_approval_workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.leave_approval_workflows_id_seq OWNED BY public.leave_approval_workflows.id;
CREATE TABLE IF NOT EXISTS public.leave_credit_transactions (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    leave_type_id integer NOT NULL,
    policy_id integer,
    amount numeric(6,2) NOT NULL,
    kind character varying(20) NOT NULL,
    period character varying(7) NOT NULL,
    reason text,
    actor_user_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.leave_credit_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.leave_credit_transactions_id_seq OWNED BY public.leave_credit_transactions.id;
CREATE TABLE IF NOT EXISTS public.leave_plan_allocations (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    leave_type_id integer NOT NULL,
    annual_quota numeric(6,2) DEFAULT 0 NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.leave_plan_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.leave_plan_allocations_id_seq OWNED BY public.leave_plan_allocations.id;
CREATE TABLE IF NOT EXISTS public.leave_plan_scope (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    scope_type character varying(30) NOT NULL,
    scope_id integer,
    priority integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.leave_plan_scope_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.leave_plan_scope_id_seq OWNED BY public.leave_plan_scope.id;
CREATE TABLE IF NOT EXISTS public.leave_plans (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'Draft'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    weekly_off_config_id integer,
    comp_off_enabled boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    accrual_method character varying(10) DEFAULT 'Annual'::character varying NOT NULL,
    carry_forward_cap integer,
    pro_rata_joiners boolean DEFAULT false NOT NULL,
    approval_workflow_id integer
);
CREATE SEQUENCE IF NOT EXISTS public.leave_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.leave_plans_id_seq OWNED BY public.leave_plans.id;
CREATE TABLE IF NOT EXISTS public.leave_policies (
    id integer NOT NULL,
    leave_type_id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'Active'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.leave_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.leave_policies_id_seq OWNED BY public.leave_policies.id;
CREATE TABLE IF NOT EXISTS public.leave_policy_scope (
    id integer NOT NULL,
    policy_id integer NOT NULL,
    scope_type character varying(30) NOT NULL,
    scope_id integer,
    priority integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.leave_policy_scope_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.leave_policy_scope_id_seq OWNED BY public.leave_policy_scope.id;
CREATE TABLE IF NOT EXISTS public.sub_departments (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(20),
    department_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.sub_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.sub_departments_id_seq OWNED BY public.sub_departments.id;
CREATE TABLE IF NOT EXISTS public.weekly_off_configs (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'Draft'::character varying NOT NULL,
    mode character varying(20) DEFAULT 'Fixed'::character varying NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.weekly_off_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.weekly_off_configs_id_seq OWNED BY public.weekly_off_configs.id;
CREATE TABLE IF NOT EXISTS public.weekly_off_scope (
    id integer NOT NULL,
    config_id integer NOT NULL,
    scope_type character varying(30) NOT NULL,
    scope_id integer,
    priority integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.weekly_off_scope_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.weekly_off_scope_id_seq OWNED BY public.weekly_off_scope.id;
ALTER TABLE ONLY public.approval_workflows ALTER COLUMN id SET DEFAULT nextval('public.approval_workflows_id_seq'::regclass);
ALTER TABLE ONLY public.comp_off_requests ALTER COLUMN id SET DEFAULT nextval('public.comp_off_requests_id_seq'::regclass);
ALTER TABLE ONLY public.holiday_calendar_scope ALTER COLUMN id SET DEFAULT nextval('public.holiday_calendar_scope_id_seq'::regclass);
ALTER TABLE ONLY public.holiday_calendars ALTER COLUMN id SET DEFAULT nextval('public.holiday_calendars_id_seq'::regclass);
ALTER TABLE ONLY public.leave_approval_workflows ALTER COLUMN id SET DEFAULT nextval('public.leave_approval_workflows_id_seq'::regclass);
ALTER TABLE ONLY public.leave_credit_transactions ALTER COLUMN id SET DEFAULT nextval('public.leave_credit_transactions_id_seq'::regclass);
ALTER TABLE ONLY public.leave_plan_allocations ALTER COLUMN id SET DEFAULT nextval('public.leave_plan_allocations_id_seq'::regclass);
ALTER TABLE ONLY public.leave_plan_scope ALTER COLUMN id SET DEFAULT nextval('public.leave_plan_scope_id_seq'::regclass);
ALTER TABLE ONLY public.leave_plans ALTER COLUMN id SET DEFAULT nextval('public.leave_plans_id_seq'::regclass);
ALTER TABLE ONLY public.leave_policies ALTER COLUMN id SET DEFAULT nextval('public.leave_policies_id_seq'::regclass);
ALTER TABLE ONLY public.leave_policy_scope ALTER COLUMN id SET DEFAULT nextval('public.leave_policy_scope_id_seq'::regclass);
ALTER TABLE ONLY public.sub_departments ALTER COLUMN id SET DEFAULT nextval('public.sub_departments_id_seq'::regclass);
ALTER TABLE ONLY public.weekly_off_configs ALTER COLUMN id SET DEFAULT nextval('public.weekly_off_configs_id_seq'::regclass);
ALTER TABLE ONLY public.weekly_off_scope ALTER COLUMN id SET DEFAULT nextval('public.weekly_off_scope_id_seq'::regclass);
ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_name_key UNIQUE (name);
ALTER TABLE ONLY public.approval_workflows
    ADD CONSTRAINT approval_workflows_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.comp_off_requests
    ADD CONSTRAINT comp_off_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.holiday_calendar_scope
    ADD CONSTRAINT holiday_calendar_scope_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.holiday_calendars
    ADD CONSTRAINT holiday_calendars_name_key UNIQUE (name);
ALTER TABLE ONLY public.holiday_calendars
    ADD CONSTRAINT holiday_calendars_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.holiday_team_links
    ADD CONSTRAINT holiday_team_links_pkey PRIMARY KEY (holiday_id, calendar_id);
ALTER TABLE ONLY public.leave_approval_workflows
    ADD CONSTRAINT leave_approval_workflows_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_credit_transactions
    ADD CONSTRAINT leave_credit_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_plan_allocations
    ADD CONSTRAINT leave_plan_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_plan_scope
    ADD CONSTRAINT leave_plan_scope_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_plans
    ADD CONSTRAINT leave_plans_name_key UNIQUE (name);
ALTER TABLE ONLY public.leave_plans
    ADD CONSTRAINT leave_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT leave_policies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_policy_scope
    ADD CONSTRAINT leave_policy_scope_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sub_departments
    ADD CONSTRAINT sub_departments_code_key UNIQUE (code);
ALTER TABLE ONLY public.sub_departments
    ADD CONSTRAINT sub_departments_name_key UNIQUE (name);
ALTER TABLE ONLY public.sub_departments
    ADD CONSTRAINT sub_departments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.weekly_off_configs
    ADD CONSTRAINT weekly_off_configs_name_key UNIQUE (name);
ALTER TABLE ONLY public.weekly_off_configs
    ADD CONSTRAINT weekly_off_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.weekly_off_scope
    ADD CONSTRAINT weekly_off_scope_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX holiday_calendars_name_unique ON public.holiday_calendars USING btree (name);
CREATE INDEX idx_comp_off_employee ON public.comp_off_requests USING btree (employee_id);
CREATE INDEX idx_comp_off_manager ON public.comp_off_requests USING btree (manager_id, status);
CREATE INDEX idx_holiday_calendar_scope_calendar ON public.holiday_calendar_scope USING btree (calendar_id);
CREATE INDEX idx_holiday_calendar_scope_lookup ON public.holiday_calendar_scope USING btree (scope_type, scope_id);
CREATE INDEX idx_holiday_team_links_calendar ON public.holiday_team_links USING btree (calendar_id);
CREATE INDEX idx_leave_credit_tx_emp ON public.leave_credit_transactions USING btree (employee_id, created_at DESC);
CREATE INDEX idx_leave_credit_tx_period ON public.leave_credit_transactions USING btree (period, kind);
CREATE INDEX idx_weekly_off_scope_config ON public.weekly_off_scope USING btree (config_id);
CREATE INDEX idx_weekly_off_scope_lookup ON public.weekly_off_scope USING btree (scope_type, scope_id);
CREATE INDEX leave_approval_workflows_policy_idx ON public.leave_approval_workflows USING btree (policy_id);
CREATE UNIQUE INDEX leave_credit_uq ON public.leave_credit_transactions USING btree (employee_id, leave_type_id, period, kind);
CREATE UNIQUE INDEX leave_plan_alloc_uq ON public.leave_plan_allocations USING btree (plan_id, leave_type_id);
CREATE UNIQUE INDEX leave_policies_default_per_type_uidx ON public.leave_policies USING btree (leave_type_id) WHERE (is_default = true);
CREATE INDEX leave_policies_leave_type_idx ON public.leave_policies USING btree (leave_type_id);
CREATE INDEX leave_policy_scope_policy_idx ON public.leave_policy_scope USING btree (policy_id);
CREATE INDEX leave_policy_scope_type_id_idx ON public.leave_policy_scope USING btree (scope_type, scope_id);
CREATE UNIQUE INDEX uq_leave_credit_tx_auto_dedup ON public.leave_credit_transactions USING btree (employee_id, leave_type_id, period, kind) WHERE ((kind)::text = ANY ((ARRAY['Accrual'::character varying, 'Grant'::character varying])::text[]));
CREATE UNIQUE INDEX weekly_off_configs_name_unique ON public.weekly_off_configs USING btree (name);
ALTER TABLE ONLY public.comp_off_requests
    ADD CONSTRAINT comp_off_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.comp_off_requests
    ADD CONSTRAINT comp_off_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.comp_off_requests
    ADD CONSTRAINT comp_off_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.holiday_calendar_scope
    ADD CONSTRAINT holiday_calendar_scope_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.holiday_calendars(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.holiday_calendars
    ADD CONSTRAINT holiday_calendars_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.holiday_team_links
    ADD CONSTRAINT holiday_team_links_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.holiday_calendars(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.holiday_team_links
    ADD CONSTRAINT holiday_team_links_holiday_id_fkey FOREIGN KEY (holiday_id) REFERENCES public.holidays(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_approval_workflows
    ADD CONSTRAINT leave_approval_workflows_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.leave_policies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_credit_transactions
    ADD CONSTRAINT leave_credit_transactions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_credit_transactions
    ADD CONSTRAINT leave_credit_transactions_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_credit_transactions
    ADD CONSTRAINT leave_credit_transactions_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.leave_policies(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_plan_allocations
    ADD CONSTRAINT leave_plan_allocations_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_plan_allocations
    ADD CONSTRAINT leave_plan_allocations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.leave_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_plan_scope
    ADD CONSTRAINT leave_plan_scope_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.leave_plans(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_plans
    ADD CONSTRAINT leave_plans_approval_workflow_id_fkey FOREIGN KEY (approval_workflow_id) REFERENCES public.approval_workflows(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_plans
    ADD CONSTRAINT leave_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_plans
    ADD CONSTRAINT leave_plans_weekly_off_config_id_fkey FOREIGN KEY (weekly_off_config_id) REFERENCES public.weekly_off_configs(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT leave_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT leave_policies_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_policy_scope
    ADD CONSTRAINT leave_policy_scope_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.leave_policies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sub_departments
    ADD CONSTRAINT sub_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.weekly_off_configs
    ADD CONSTRAINT weekly_off_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.weekly_off_scope
    ADD CONSTRAINT weekly_off_scope_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.weekly_off_configs(id) ON DELETE CASCADE;
\unrestrict hUe0g9vaUjd7hWjtNNDP5qHkPL6ZflGJAnFpal3BbC8N6wDmI7zChKO29C9FyE9

-- ── Column additions to pre-existing tables (idempotent) ─────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type_id integer NOT NULL DEFAULT 4;

-- leave_types: Phase-1 catalog columns; color removed
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT true;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS allow_half_day boolean NOT NULL DEFAULT true;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS allow_negative_balance boolean NOT NULL DEFAULT false;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS gender_restriction varchar(10);
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS min_notice_days integer NOT NULL DEFAULT 0;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS requires_proof_after_days integer;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS max_continuous_days integer;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS hourly_leave_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS carry_forward_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS encashment_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS attachment_required boolean NOT NULL DEFAULT false;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS allowed_in_probation boolean NOT NULL DEFAULT true;
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE leave_types DROP COLUMN IF EXISTS color;

-- employees: sub-department link
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sub_department_id integer REFERENCES sub_departments(id) ON DELETE SET NULL;

-- leave_requests: approval-workflow runtime
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS workflow_stages jsonb;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS current_stage integer NOT NULL DEFAULT 0;

-- holidays: calendar linkage
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS calendar_id integer REFERENCES holiday_calendars(id) ON DELETE CASCADE;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_half_day boolean NOT NULL DEFAULT false;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '[]'::jsonb;

-- leave_credit_transactions: idempotency guard the engine relies on
CREATE UNIQUE INDEX IF NOT EXISTS leave_credit_uq
  ON leave_credit_transactions (employee_id, leave_type_id, period, kind);

