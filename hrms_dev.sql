--
-- PostgreSQL database dump
--

\restrict nV9XP2AmDYnO9WruW8wFUCbLdsm8zbXsPeL4f2hj43XjIKu5VdQbKRVaAPqN1bP

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: action_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.action_type_enum AS ENUM (
    'Promotion',
    'Demotion',
    'Transfer'
);


ALTER TYPE public.action_type_enum OWNER TO postgres;

--
-- Name: att_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.att_status_enum AS ENUM (
    'Present',
    'Absent',
    'Half Day',
    'Leave',
    'Holiday',
    'Weekend'
);


ALTER TYPE public.att_status_enum OWNER TO postgres;

--
-- Name: broadcast_target_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.broadcast_target_enum AS ENUM (
    'all',
    'department',
    'individual'
);


ALTER TYPE public.broadcast_target_enum OWNER TO postgres;

--
-- Name: day_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.day_type_enum AS ENUM (
    'Full',
    'Half',
    'Off'
);


ALTER TYPE public.day_type_enum OWNER TO postgres;

--
-- Name: document_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_status_enum AS ENUM (
    'Pending',
    'Uploaded',
    'Verified',
    'Rejected'
);


ALTER TYPE public.document_status_enum OWNER TO postgres;

--
-- Name: document_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_type_enum AS ENUM (
    'Offer Letter',
    'Appointment Letter',
    'Aadhaar Card',
    'PAN Card',
    'Educational Certificates',
    'Profile Photo',
    'Pay Slip'
);


ALTER TYPE public.document_type_enum OWNER TO postgres;

--
-- Name: duration_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.duration_type_enum AS ENUM (
    'Full Day',
    'First Half',
    'Second Half'
);


ALTER TYPE public.duration_type_enum OWNER TO postgres;

--
-- Name: employee_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.employee_status_enum AS ENUM (
    'Active',
    'Inactive',
    'Probation',
    'Notice',
    'Exited'
);


ALTER TYPE public.employee_status_enum OWNER TO postgres;

--
-- Name: encashment_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.encashment_status_enum AS ENUM (
    'Pending',
    'Approved',
    'Rejected'
);


ALTER TYPE public.encashment_status_enum OWNER TO postgres;

--
-- Name: gender_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gender_enum AS ENUM (
    'Male',
    'Female',
    'Other'
);


ALTER TYPE public.gender_enum OWNER TO postgres;

--
-- Name: holiday_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.holiday_type_enum AS ENUM (
    'National',
    'Regional',
    'Optional'
);


ALTER TYPE public.holiday_type_enum OWNER TO postgres;

--
-- Name: hr_decision_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.hr_decision_enum AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'Override'
);


ALTER TYPE public.hr_decision_enum OWNER TO postgres;

--
-- Name: leave_decision_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.leave_decision_enum AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'Forwarded'
);


ALTER TYPE public.leave_decision_enum OWNER TO postgres;

--
-- Name: leave_req_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.leave_req_status_enum AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'Cancelled',
    'Forwarded'
);


ALTER TYPE public.leave_req_status_enum OWNER TO postgres;

--
-- Name: marital_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.marital_status_enum AS ENUM (
    'Single',
    'Married'
);


ALTER TYPE public.marital_status_enum OWNER TO postgres;

--
-- Name: notif_kind_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notif_kind_enum AS ENUM (
    'leave',
    'team',
    'hr',
    'holiday',
    'event'
);


ALTER TYPE public.notif_kind_enum OWNER TO postgres;

--
-- Name: organization_join_request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.organization_join_request_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);


ALTER TYPE public.organization_join_request_status OWNER TO postgres;

--
-- Name: payroll_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payroll_status_enum AS ENUM (
    'Active',
    'Hold',
    'Closed'
);


ALTER TYPE public.payroll_status_enum OWNER TO postgres;

--
-- Name: perf_label_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.perf_label_enum AS ENUM (
    'Good',
    'Excellent',
    'Needs Attention'
);


ALTER TYPE public.perf_label_enum OWNER TO postgres;

--
-- Name: regularise_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.regularise_status_enum AS ENUM (
    'Pending',
    'Approved',
    'Rejected'
);


ALTER TYPE public.regularise_status_enum OWNER TO postgres;

--
-- Name: resignation_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.resignation_status_enum AS ENUM (
    'Pending',
    'Approved',
    'Withdrawn'
);


ALTER TYPE public.resignation_status_enum OWNER TO postgres;

--
-- Name: transfer_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transfer_status_enum AS ENUM (
    'Pending',
    'Approved'
);


ALTER TYPE public.transfer_status_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp without time zone,
    refresh_token_expires_at timestamp without time zone,
    scope text,
    password text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: apikeys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.apikeys (
    id text NOT NULL,
    config_id text DEFAULT 'default'::text NOT NULL,
    name text,
    start text,
    reference_id text NOT NULL,
    prefix text,
    key text NOT NULL,
    refill_interval integer,
    refill_amount integer,
    last_refill_at timestamp without time zone,
    enabled boolean DEFAULT true,
    rate_limit_enabled boolean DEFAULT true,
    rate_limit_time_window integer DEFAULT 86400000,
    rate_limit_max integer DEFAULT 10,
    request_count integer DEFAULT 0,
    remaining integer,
    last_request timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    permissions text,
    metadata text
);


ALTER TABLE public.apikeys OWNER TO postgres;

--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_records (
    employee_id integer NOT NULL,
    date date NOT NULL,
    punch_in time without time zone,
    punch_out time without time zone,
    working_minutes integer,
    late_by_minutes integer DEFAULT 0 NOT NULL,
    early_exit_minutes integer DEFAULT 0 NOT NULL,
    status public.att_status_enum NOT NULL,
    location character varying(200),
    is_regularised boolean DEFAULT false NOT NULL,
    regularisation_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT att_early_minutes_chk CHECK ((early_exit_minutes >= 0)),
    CONSTRAINT att_late_minutes_chk CHECK ((late_by_minutes >= 0)),
    CONSTRAINT att_punch_out_after_in_chk CHECK (((punch_out IS NULL) OR (punch_out > punch_in))),
    CONSTRAINT att_working_minutes_chk CHECK (((working_minutes IS NULL) OR (working_minutes >= 0)))
);


ALTER TABLE public.attendance_records OWNER TO postgres;

--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    employee_id integer NOT NULL,
    account_number character varying(25) NOT NULL,
    account_name character varying(100) NOT NULL,
    bank_name character varying(100) NOT NULL,
    branch_name character varying(100) NOT NULL,
    ifsc_code character varying(11) NOT NULL,
    passbook_url character varying(500),
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bank_ifsc_chk CHECK (((ifsc_code)::text ~ '^[A-Z]{4}0[A-Z0-9]{6}$'::text))
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    address text,
    headcount integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT branches_headcount_chk CHECK ((headcount >= 0))
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.branches_id_seq OWNER TO postgres;

--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcasts (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    target_type public.broadcast_target_enum NOT NULL,
    message text NOT NULL,
    target_dept_ids integer[] DEFAULT '{}'::integer[] NOT NULL,
    target_emp_ids integer[] DEFAULT '{}'::integer[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bc_all_no_ids_chk CHECK (((target_type <> 'all'::public.broadcast_target_enum) OR ((array_length(target_dept_ids, 1) IS NULL) AND (array_length(target_emp_ids, 1) IS NULL)))),
    CONSTRAINT bc_dept_ids_when_dept_chk CHECK (((target_type <> 'department'::public.broadcast_target_enum) OR (array_length(target_dept_ids, 1) > 0))),
    CONSTRAINT bc_emp_ids_when_individual_chk CHECK (((target_type <> 'individual'::public.broadcast_target_enum) OR (array_length(target_emp_ids, 1) > 0)))
);


ALTER TABLE public.broadcasts OWNER TO postgres;

--
-- Name: broadcasts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcasts_id_seq OWNER TO postgres;

--
-- Name: broadcasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcasts_id_seq OWNED BY public.broadcasts.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    manager_id integer,
    location_area character varying(200),
    headcount integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dept_headcount_chk CHECK ((headcount >= 0))
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: designations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.designations (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    department_id integer,
    grade_min_id integer,
    grade_max_id integer,
    employee_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT designation_emp_count_chk CHECK ((employee_count >= 0))
);


ALTER TABLE public.designations OWNER TO postgres;

--
-- Name: designations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.designations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.designations_id_seq OWNER TO postgres;

--
-- Name: designations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.designations_id_seq OWNED BY public.designations.id;


--
-- Name: employee_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_documents (
    employee_id integer NOT NULL,
    document_type public.document_type_enum NOT NULL,
    document_urls character varying(500)[] DEFAULT '{}'::character varying(500)[] NOT NULL,
    status public.document_status_enum DEFAULT 'Uploaded'::public.document_status_enum NOT NULL,
    verified_by integer,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT doc_urls_not_empty_chk CHECK (((status = 'Pending'::public.document_status_enum) OR (array_length(document_urls, 1) > 0))),
    CONSTRAINT doc_verified_at_requires_by_chk CHECK (((verified_at IS NULL) OR (verified_by IS NOT NULL)))
);


ALTER TABLE public.employee_documents OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    emp_id character varying(20) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    personal_email public.citext NOT NULL,
    work_email public.citext,
    phone character varying(20) NOT NULL,
    dob date NOT NULL,
    gender public.gender_enum NOT NULL,
    blood_group character varying(5),
    nationality character varying(50) DEFAULT 'Indian'::character varying NOT NULL,
    marital_status public.marital_status_enum,
    spouse_name character varying(200),
    father_name character varying(200),
    mother_name character varying(200),
    current_address text,
    permanent_address text,
    emergency_contact_name character varying(200),
    emergency_contact_phone character varying(20),
    pan_no character varying(15),
    uan_no character varying(20),
    aadhaar_no character varying(12),
    esic_no character varying(20),
    linkedin_url character varying(255),
    profile_photo_url character varying(500),
    reporting_chain integer[] DEFAULT '{}'::integer[] NOT NULL,
    department_id integer,
    designation_id integer,
    grade_id integer,
    branch_id integer,
    employment_type_id integer,
    reporting_manager_id integer,
    joining_date date NOT NULL,
    date_of_exit date,
    employee_status public.employee_status_enum DEFAULT 'Active'::public.employee_status_enum NOT NULL,
    payroll_status public.payroll_status_enum DEFAULT 'Active'::public.payroll_status_enum NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text,
    CONSTRAINT emp_aadhaar_chk CHECK (((aadhaar_no IS NULL) OR ((aadhaar_no)::text ~ '^[0-9]{12}$'::text))),
    CONSTRAINT emp_dob_18yrs_chk CHECK ((dob <= (CURRENT_DATE - '18 years'::interval))),
    CONSTRAINT emp_emergency_phone_chk CHECK (((emergency_contact_phone IS NULL) OR ((emergency_contact_phone)::text ~ '^\+?[0-9]{7,15}$'::text))),
    CONSTRAINT emp_exit_after_join_chk CHECK (((date_of_exit IS NULL) OR (date_of_exit >= joining_date))),
    CONSTRAINT emp_no_self_manager_chk CHECK ((reporting_manager_id <> id)),
    CONSTRAINT emp_pan_chk CHECK (((pan_no IS NULL) OR ((pan_no)::text ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::text))),
    CONSTRAINT emp_phone_chk CHECK (((phone)::text ~ '^\+?[0-9]{7,15}$'::text)),
    CONSTRAINT emp_spouse_when_married_chk CHECK (((marital_status <> 'Married'::public.marital_status_enum) OR (spouse_name IS NOT NULL)))
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: employment_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employment_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    notice_period_days integer,
    active_employee_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT emp_type_active_count_chk CHECK ((active_employee_count >= 0)),
    CONSTRAINT emp_type_notice_period_chk CHECK (((notice_period_days IS NULL) OR (notice_period_days >= 0)))
);


ALTER TABLE public.employment_types OWNER TO postgres;

--
-- Name: employment_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employment_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employment_types_id_seq OWNER TO postgres;

--
-- Name: employment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employment_types_id_seq OWNED BY public.employment_types.id;


--
-- Name: grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grades (
    id integer NOT NULL,
    code character varying(5) NOT NULL,
    band_name character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.grades OWNER TO postgres;

--
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grades_id_seq OWNER TO postgres;

--
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id integer NOT NULL,
    date date NOT NULL,
    name character varying(200) NOT NULL,
    type public.holiday_type_enum DEFAULT 'National'::public.holiday_type_enum NOT NULL,
    branch_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holidays_id_seq OWNER TO postgres;

--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invitations (
    id text NOT NULL,
    organization_id text NOT NULL,
    email text NOT NULL,
    role text,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    inviter_id text NOT NULL
);


ALTER TABLE public.invitations OWNER TO postgres;

--
-- Name: leave_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_balances (
    employee_id integer NOT NULL,
    leave_type_id integer NOT NULL,
    opening_balance numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    accrued numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    used numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    carried_forward numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    collapsed boolean DEFAULT false NOT NULL,
    closing_balance numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lb_closing_balance_chk CHECK ((closing_balance >= (0)::numeric))
);


ALTER TABLE public.leave_balances OWNER TO postgres;

--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    leave_type_id integer NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    days numeric(4,1) NOT NULL,
    duration_type public.duration_type_enum NOT NULL,
    reason text NOT NULL,
    document_urls character varying(500)[] DEFAULT '{}'::character varying(500)[] NOT NULL,
    status public.leave_req_status_enum DEFAULT 'Pending'::public.leave_req_status_enum NOT NULL,
    applied_on date DEFAULT CURRENT_DATE NOT NULL,
    manager_id integer,
    manager_decision public.leave_decision_enum,
    manager_decided_at timestamp with time zone,
    manager_remarks text,
    hr_id integer,
    hr_decision public.hr_decision_enum,
    hr_decided_at timestamp with time zone,
    hr_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lr_applied_date_chk CHECK ((applied_on <= CURRENT_DATE)),
    CONSTRAINT lr_days_chk CHECK ((days > (0)::numeric)),
    CONSTRAINT lr_half_day_chk CHECK (((duration_type = 'Full Day'::public.duration_type_enum) OR (days = 0.5))),
    CONSTRAINT lr_to_after_from_chk CHECK ((to_date >= from_date))
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leave_requests_id_seq OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(5) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leave_types OWNER TO postgres;

--
-- Name: leave_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leave_types_id_seq OWNER TO postgres;

--
-- Name: leave_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_types_id_seq OWNED BY public.leave_types.id;


--
-- Name: members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.members (
    id text NOT NULL,
    organization_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.members OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    recipient_id integer NOT NULL,
    kind public.notif_kind_enum NOT NULL,
    title character varying(255) NOT NULL,
    sub character varying(500),
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: organization_domains; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    domain text NOT NULL,
    is_approved boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization_domains OWNER TO postgres;

--
-- Name: organization_join_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    email text NOT NULL,
    name text,
    company_domain text NOT NULL,
    status public.organization_join_request_status DEFAULT 'pending'::public.organization_join_request_status NOT NULL,
    requester_user_id text,
    reviewed_by_user_id text,
    reviewed_at timestamp with time zone,
    created_invitation_id text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organization_join_requests OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    created_at timestamp without time zone NOT NULL,
    metadata text
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: regularisation_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regularisation_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    date date NOT NULL,
    original_issue character varying(255),
    requested_punch_in time without time zone NOT NULL,
    requested_punch_out time without time zone NOT NULL,
    reason text NOT NULL,
    proof_document_urls character varying(500)[] DEFAULT '{}'::character varying(500)[] NOT NULL,
    status public.regularise_status_enum DEFAULT 'Pending'::public.regularise_status_enum NOT NULL,
    approver_id integer,
    approver_remarks text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reg_decided_needs_approver_chk CHECK (((decided_at IS NULL) OR (approver_id IS NOT NULL))),
    CONSTRAINT reg_punch_out_after_in_chk CHECK ((requested_punch_out > requested_punch_in))
);


ALTER TABLE public.regularisation_requests OWNER TO postgres;

--
-- Name: regularisation_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.regularisation_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.regularisation_requests_id_seq OWNER TO postgres;

--
-- Name: regularisation_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.regularisation_requests_id_seq OWNED BY public.regularisation_requests.id;


--
-- Name: resignations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resignations (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    last_working_date date NOT NULL,
    reason text NOT NULL,
    status public.resignation_status_enum DEFAULT 'Pending'::public.resignation_status_enum NOT NULL,
    submitted_on date DEFAULT CURRENT_DATE NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT resignation_approved_needs_approver_chk CHECK (((approved_at IS NULL) OR (approved_by IS NOT NULL))),
    CONSTRAINT resignation_lwd_future_chk CHECK ((last_working_date >= submitted_on))
);


ALTER TABLE public.resignations OWNER TO postgres;

--
-- Name: resignations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resignations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resignations_id_seq OWNER TO postgres;

--
-- Name: resignations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resignations_id_seq OWNED BY public.resignations.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL,
    active_organization_id text,
    impersonated_by text
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: two_factors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.two_factors (
    id text NOT NULL,
    secret text NOT NULL,
    backup_codes text NOT NULL,
    user_id text NOT NULL,
    verified boolean DEFAULT true
);


ALTER TABLE public.two_factors OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text,
    banned boolean DEFAULT false,
    ban_reason text,
    ban_expires timestamp without time zone,
    two_factor_enabled boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verifications (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verifications OWNER TO postgres;

--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: broadcasts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts ALTER COLUMN id SET DEFAULT nextval('public.broadcasts_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: designations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations ALTER COLUMN id SET DEFAULT nextval('public.designations_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: employment_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employment_types ALTER COLUMN id SET DEFAULT nextval('public.employment_types_id_seq'::regclass);


--
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: leave_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_types ALTER COLUMN id SET DEFAULT nextval('public.leave_types_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: regularisation_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regularisation_requests ALTER COLUMN id SET DEFAULT nextval('public.regularisation_requests_id_seq'::regclass);


--
-- Name: resignations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resignations ALTER COLUMN id SET DEFAULT nextval('public.resignations_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at) FROM stdin;
4a7ddf9e-0a5c-4053-821c-fab1c1dab8c1	a0b5e150-d50d-4d15-8211-465fba02866d	credential	a0b5e150-d50d-4d15-8211-465fba02866d	\N	\N	\N	\N	\N	\N	$2a$10$gm4RdkjKEt/Qm..KVYTWJuO8jrbqQMDXZG35txAVk3zkG9X9MPnUG	2026-06-02 11:38:41.06	2026-06-02 11:38:41.06
495895f7-eb81-4b37-84db-7212c7be5a0f	7d64f393-bc98-4425-b654-eb003d24438f	credential	7d64f393-bc98-4425-b654-eb003d24438f	\N	\N	\N	\N	\N	\N	$2a$10$Iq/PELvyoEShvi5b7Dq65ucBD9FHCjN10WCc6cOG.YulLJd7WvnGi	2026-06-02 11:38:41.13	2026-06-02 11:38:41.13
1f8fa8e4-5a5b-45c4-b61e-402fd62a4a42	c52905f4-713a-4910-98c7-457632a3e676	credential	c52905f4-713a-4910-98c7-457632a3e676	\N	\N	\N	\N	\N	\N	$2a$10$8hgfPM9TWuLGhf720XiKQuzOh5k9y3WJUNkTI9e.F/SH4Ovu3T3gW	2026-06-02 11:38:41.196	2026-06-02 11:38:41.196
0c63cb27-054a-4828-9456-6da3b18ce4df	c98de65b-daa8-4e6c-a677-ec75e5d5238f	credential	c98de65b-daa8-4e6c-a677-ec75e5d5238f	\N	\N	\N	\N	\N	\N	$2a$10$ckfRCzaJqDJmRQI4SwCXGeBqDcPMPI.Jg5HT1zmkYnthKGc3lAjF.	2026-06-02 11:38:41.261	2026-06-02 11:38:41.261
a0228a45-5200-4bb3-99d9-68333bb83bcb	ef458343-434c-4e49-a1a5-bbf01085d370	credential	ef458343-434c-4e49-a1a5-bbf01085d370	\N	\N	\N	\N	\N	\N	$2a$10$fB0zqRUhbOWq4ySWT.Jaae/E.yUiY8tJtK.lMtkaMBK2RcQIhiYtq	2026-06-02 11:38:41.326	2026-06-02 11:38:41.326
eff80dd7-34f3-4184-af2f-4e77df21ac7f	05c323f2-d149-464a-8668-01522c8b2177	credential	05c323f2-d149-464a-8668-01522c8b2177	\N	\N	\N	\N	\N	\N	$2a$10$CS1s7er/al6HAsLczC/OnevWKUjsZeHxwoqLfk0V6geB/Q2kqNZe6	2026-06-02 11:38:41.392	2026-06-02 11:38:41.392
6bca0203-9e79-441b-82b2-6f0e7c14e30a	2c76d35a-7583-447c-9d8b-02c030c63c18	credential	2c76d35a-7583-447c-9d8b-02c030c63c18	\N	\N	\N	\N	\N	\N	$2a$10$SQPtAQOFqjQ6UbrFl13HD.pA5HPXqkPwBXGCeeWDigQBgs3J4c6vm	2026-06-02 11:38:41.457	2026-06-02 11:38:41.457
\.


--
-- Data for Name: apikeys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.apikeys (id, config_id, name, start, reference_id, prefix, key, refill_interval, refill_amount, last_refill_at, enabled, rate_limit_enabled, rate_limit_time_window, rate_limit_max, request_count, remaining, last_request, expires_at, created_at, updated_at, permissions, metadata) FROM stdin;
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_records (employee_id, date, punch_in, punch_out, working_minutes, late_by_minutes, early_exit_minutes, status, location, is_regularised, regularisation_id, created_at, updated_at) FROM stdin;
2	2026-06-01	09:03:00	\N	235	3	0	Present	iLeads Dehradun HQ	f	\N	2026-06-01 13:55:40.202352+05:30	2026-06-01 13:55:40.202352+05:30
3	2026-06-01	09:04:00	\N	240	4	0	Present	iLeads Dehradun HQ	f	\N	2026-06-01 13:55:40.203056+05:30	2026-06-01 13:55:40.203056+05:30
4	2026-06-01	09:05:00	\N	245	5	0	Present	iLeads Dehradun HQ	f	\N	2026-06-01 13:55:40.203807+05:30	2026-06-01 13:55:40.203807+05:30
5	2026-06-01	09:06:00	\N	250	6	0	Present	iLeads Dehradun HQ	f	\N	2026-06-01 13:55:40.204439+05:30	2026-06-01 13:55:40.204439+05:30
6	2026-06-01	09:00:00	\N	220	0	0	Present	iLeads Dehradun HQ	f	\N	2026-06-01 13:55:40.205362+05:30	2026-06-01 13:55:40.205362+05:30
7	2026-06-01	09:01:00	\N	225	1	0	Present	iLeads Dehradun HQ	f	\N	2026-06-01 13:55:40.206061+05:30	2026-06-01 13:55:40.206061+05:30
1	2026-06-01	09:02:00	16:09:42	427	2	0	Present	iLeads Dehradun HQ	f	\N	2026-06-01 13:55:40.192969+05:30	2026-06-01 16:09:42.485+05:30
1	2026-06-02	12:22:44	15:54:17	212	0	0	Present	Web	f	\N	2026-06-02 12:22:44.85029+05:30	2026-06-02 15:54:17.231+05:30
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (employee_id, account_number, account_name, bank_name, branch_name, ifsc_code, passbook_url, is_primary, created_at) FROM stdin;
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.branches (id, name, address, headcount, created_at, updated_at) FROM stdin;
1	iLeads Dehradun HQ	Dehradun, UK	7	2026-06-01 13:55:39.849371+05:30	2026-06-01 13:55:39.849371+05:30
\.


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.broadcasts (id, sender_id, target_type, message, target_dept_ids, target_emp_ids, created_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, manager_id, location_area, headcount, created_at, updated_at) FROM stdin;
1	Operations	\N	HQ-3F	7	2026-06-01 13:55:39.898183+05:30	2026-06-01 13:55:39.898183+05:30
\.


--
-- Data for Name: designations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.designations (id, name, department_id, grade_min_id, grade_max_id, employee_count, created_at, updated_at) FROM stdin;
1	Senior Associate	1	2	2	1	2026-06-01 13:55:40.018074+05:30	2026-06-01 13:55:40.018074+05:30
2	Process Manager	1	4	5	1	2026-06-01 13:55:40.029738+05:30	2026-06-01 13:55:40.029738+05:30
3	Associate	1	1	1	1	2026-06-01 13:55:40.03212+05:30	2026-06-01 13:55:40.03212+05:30
4	Senior Associate Plus	1	3	3	1	2026-06-01 13:55:40.032939+05:30	2026-06-01 13:55:40.032939+05:30
5	Team Leader	1	4	4	1	2026-06-01 13:55:40.03381+05:30	2026-06-01 13:55:40.03381+05:30
6	Quality Analyst	1	2	2	1	2026-06-01 13:55:40.034618+05:30	2026-06-01 13:55:40.034618+05:30
\.


--
-- Data for Name: employee_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_documents (employee_id, document_type, document_urls, status, verified_by, verified_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, emp_id, first_name, last_name, personal_email, work_email, phone, dob, gender, blood_group, nationality, marital_status, spouse_name, father_name, mother_name, current_address, permanent_address, emergency_contact_name, emergency_contact_phone, pan_no, uan_no, aadhaar_no, esic_no, linkedin_url, profile_photo_url, reporting_chain, department_id, designation_id, grade_id, branch_id, employment_type_id, reporting_manager_id, joining_date, date_of_exit, employee_status, payroll_status, password_hash, created_at, updated_at, user_id) FROM stdin;
1	ILD-2847	Rahul	Mehta	rahul.mehta@example.com	rahul@ileads.example	9999900001	1995-04-12	Male	\N	Indian	Single	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{2}	1	1	2	1	1	2	2022-01-15	\N	Active	Active	$2a$10$placeholder	2026-06-01 13:55:40.051641+05:30	2026-06-01 13:55:40.051641+05:30	a0b5e150-d50d-4d15-8211-465fba02866d
3	ILD-3001	Aarav	Singh	aarav.singh@example.com	aarav@ileads.example	9999900003	1996-02-11	Male	\N	Indian	Single	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{2}	1	3	1	1	1	2	2023-02-01	\N	Active	Active	$2a$10$placeholder	2026-06-01 13:55:40.152041+05:30	2026-06-01 13:55:40.152041+05:30	7d64f393-bc98-4425-b654-eb003d24438f
4	ILD-3002	Kavya	Bhatt	kavya.bhatt@example.com	kavya@ileads.example	9999900004	1997-07-30	Female	\N	Indian	Single	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{2}	1	3	1	1	1	2	2023-03-15	\N	Active	Active	$2a$10$placeholder	2026-06-01 13:55:40.152905+05:30	2026-06-01 13:55:40.152905+05:30	c52905f4-713a-4910-98c7-457632a3e676
5	ILD-3003	Rohan	Thapa	rohan.thapa@example.com	rohan@ileads.example	9999900005	1990-11-04	Male	\N	Indian	Married	Nikita Thapa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{2}	1	5	4	1	1	2	2019-08-10	\N	Active	Active	$2a$10$placeholder	2026-06-01 13:55:40.154065+05:30	2026-06-01 13:55:40.154065+05:30	c98de65b-daa8-4e6c-a677-ec75e5d5238f
6	ILD-3004	Ishaan	Pant	ishaan.pant@example.com	ishaan@ileads.example	9999900006	1995-05-23	Male	\N	Indian	Single	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{2}	1	3	1	1	1	2	2022-10-12	\N	Active	Active	$2a$10$placeholder	2026-06-01 13:55:40.155075+05:30	2026-06-01 13:55:40.155075+05:30	ef458343-434c-4e49-a1a5-bbf01085d370
7	ILD-3005	Vikram	Negi	vikram.negi@example.com	vikram@ileads.example	9999900007	1992-12-09	Male	\N	Indian	Married	Sara Negi	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{2}	1	6	2	1	1	2	2021-04-01	\N	Active	Active	$2a$10$placeholder	2026-06-01 13:55:40.156366+05:30	2026-06-01 13:55:40.156366+05:30	05c323f2-d149-464a-8668-01522c8b2177
2	ILD-1042	Priya	Sharma	priya.sharma@example.com	priya@ileads.example	9999900002	1988-09-21	Female	\N	Indian	Married	Aman Sharma	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	1	2	4	1	1	\N	2018-06-04	\N	Active	Active	$2a$10$placeholder	2026-06-01 13:55:40.150669+05:30	2026-06-01 13:55:40.150669+05:30	2c76d35a-7583-447c-9d8b-02c030c63c18
\.


--
-- Data for Name: employment_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employment_types (id, name, notice_period_days, active_employee_count, created_at) FROM stdin;
1	Full-Time	60	7	2026-06-01 13:55:40.004842+05:30
\.


--
-- Data for Name: grades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grades (id, code, band_name, created_at) FROM stdin;
1	L1	Junior IC	2026-06-01 13:55:39.982184+05:30
2	L2	Mid IC	2026-06-01 13:55:39.991295+05:30
3	L3	Senior IC	2026-06-01 13:55:39.992634+05:30
4	M1	Lead	2026-06-01 13:55:39.993713+05:30
5	M2	Manager	2026-06-01 13:55:39.99436+05:30
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, date, name, type, branch_id, created_at) FROM stdin;
1	2026-06-07	Eid Al-Adha	National	\N	2026-06-02 14:06:32.113351+05:30
2	2026-06-15	Garhwali Diwas	Regional	\N	2026-06-02 14:06:32.124079+05:30
3	2026-07-04	Rath Yatra	Optional	\N	2026-06-02 14:06:32.12529+05:30
4	2026-08-15	Independence Day	National	\N	2026-06-02 14:06:32.127175+05:30
5	2026-08-26	Janmashtami	Optional	\N	2026-06-02 14:06:32.128394+05:30
6	2026-10-02	Gandhi Jayanti	National	\N	2026-06-02 14:06:32.129532+05:30
7	2026-10-21	Diwali	National	\N	2026-06-02 14:06:32.130282+05:30
8	2026-12-25	Christmas	National	\N	2026-06-02 14:06:32.13105+05:30
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invitations (id, organization_id, email, role, status, expires_at, created_at, inviter_id) FROM stdin;
\.


--
-- Data for Name: leave_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_balances (employee_id, leave_type_id, opening_balance, accrued, used, carried_forward, collapsed, closing_balance, updated_at) FROM stdin;
1	1	18.00	0.00	6.00	0.00	f	12.00	2026-06-01 13:55:40.170618+05:30
1	2	8.00	0.00	2.00	0.00	f	6.00	2026-06-01 13:55:40.178022+05:30
1	3	6.00	0.00	1.00	0.00	f	5.00	2026-06-01 13:55:40.17873+05:30
1	4	4.00	0.00	0.00	0.00	f	4.00	2026-06-01 13:55:40.179449+05:30
2	1	18.00	0.00	2.00	0.00	f	16.00	2026-06-01 13:55:40.180206+05:30
2	2	8.00	0.00	2.00	0.00	f	6.00	2026-06-01 13:55:40.18087+05:30
2	3	6.00	0.00	1.00	0.00	f	5.00	2026-06-01 13:55:40.181733+05:30
2	4	4.00	0.00	0.00	0.00	f	4.00	2026-06-01 13:55:40.182238+05:30
3	1	18.00	0.00	2.00	0.00	f	16.00	2026-06-01 13:55:40.182696+05:30
3	2	8.00	0.00	2.00	0.00	f	6.00	2026-06-01 13:55:40.183192+05:30
3	3	6.00	0.00	1.00	0.00	f	5.00	2026-06-01 13:55:40.18367+05:30
3	4	4.00	0.00	0.00	0.00	f	4.00	2026-06-01 13:55:40.184066+05:30
4	1	18.00	0.00	2.00	0.00	f	16.00	2026-06-01 13:55:40.184549+05:30
4	2	8.00	0.00	2.00	0.00	f	6.00	2026-06-01 13:55:40.18531+05:30
4	3	6.00	0.00	1.00	0.00	f	5.00	2026-06-01 13:55:40.185913+05:30
4	4	4.00	0.00	0.00	0.00	f	4.00	2026-06-01 13:55:40.186372+05:30
5	1	18.00	0.00	2.00	0.00	f	16.00	2026-06-01 13:55:40.186947+05:30
5	2	8.00	0.00	2.00	0.00	f	6.00	2026-06-01 13:55:40.187432+05:30
5	3	6.00	0.00	1.00	0.00	f	5.00	2026-06-01 13:55:40.18787+05:30
5	4	4.00	0.00	0.00	0.00	f	4.00	2026-06-01 13:55:40.188322+05:30
6	1	18.00	0.00	2.00	0.00	f	16.00	2026-06-01 13:55:40.18878+05:30
6	2	8.00	0.00	2.00	0.00	f	6.00	2026-06-01 13:55:40.189262+05:30
6	3	6.00	0.00	1.00	0.00	f	5.00	2026-06-01 13:55:40.189705+05:30
6	4	4.00	0.00	0.00	0.00	f	4.00	2026-06-01 13:55:40.190108+05:30
7	1	18.00	0.00	2.00	0.00	f	16.00	2026-06-01 13:55:40.19054+05:30
7	2	8.00	0.00	2.00	0.00	f	6.00	2026-06-01 13:55:40.190987+05:30
7	3	6.00	0.00	1.00	0.00	f	5.00	2026-06-01 13:55:40.191402+05:30
7	4	4.00	0.00	0.00	0.00	f	4.00	2026-06-01 13:55:40.192002+05:30
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_requests (id, employee_id, leave_type_id, from_date, to_date, days, duration_type, reason, document_urls, status, applied_on, manager_id, manager_decision, manager_decided_at, manager_remarks, hr_id, hr_decision, hr_decided_at, hr_remarks, created_at, updated_at) FROM stdin;
1	1	3	2026-05-25	2026-05-25	0.5	First Half	Personal errand	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.206809+05:30	2026-06-01 13:55:40.206809+05:30
2	1	2	2026-05-11	2026-05-13	3.0	Full Day	Flu and fever	{}	Approved	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.216598+05:30	2026-06-01 13:55:40.216598+05:30
3	1	5	2026-04-27	2026-04-27	1.0	Full Day	Family function	{}	Cancelled	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.218187+05:30	2026-06-01 13:55:40.218187+05:30
4	3	1	2026-06-04	2026-06-06	3.0	Full Day	Family wedding	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.219126+05:30	2026-06-01 13:55:40.219126+05:30
5	4	2	2026-06-02	2026-06-03	2.0	Full Day	Viral fever; certificate attached	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.22032+05:30	2026-06-01 13:55:40.22032+05:30
6	5	3	2026-06-07	2026-06-07	1.0	Full Day	Personal work — bank documentation	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.221181+05:30	2026-06-01 13:55:40.221181+05:30
7	6	1	2026-06-15	2026-06-16	2.0	Full Day	Family trip	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.222255+05:30	2026-06-01 13:55:40.222255+05:30
8	7	5	2026-06-09	2026-06-11	3.0	Full Day	Going out of town	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 13:55:40.222726+05:30	2026-06-01 13:55:40.222726+05:30
10	1	1	2026-06-03	2026-06-03	1.0	Full Day	klska	{}	Approved	2026-06-01	2	Approved	2026-06-01 14:42:12.353+05:30	\N	\N	\N	\N	\N	2026-06-01 14:41:54.292468+05:30	2026-06-01 14:42:12.354+05:30
9	1	1	2026-06-02	2026-06-02	1.0	Full Day	leave	{}	Rejected	2026-06-01	2	Rejected	2026-06-01 14:51:16.993+05:30	chal be	\N	\N	\N	\N	2026-06-01 14:40:57.945945+05:30	2026-06-01 14:51:16.995+05:30
11	1	2	2026-06-11	2026-06-11	1.0	Full Day	sick leave	{}	Approved	2026-06-01	2	Approved	2026-06-01 14:51:29.163+05:30	\N	\N	\N	\N	\N	2026-06-01 14:50:46.089156+05:30	2026-06-01 14:51:29.164+05:30
13	1	1	2026-06-04	2026-06-04	1.0	Full Day	kjsjad	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 15:18:57.440683+05:30	2026-06-01 15:18:57.440683+05:30
14	1	3	2026-06-09	2026-06-09	1.0	Full Day	kldask	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 16:09:03.091962+05:30	2026-06-01 16:09:03.091962+05:30
15	1	1	2026-06-10	2026-06-10	1.0	Full Day	dfadss	{}	Pending	2026-06-01	2	\N	\N	\N	\N	\N	\N	\N	2026-06-01 16:37:19.830961+05:30	2026-06-01 16:37:19.830961+05:30
\.


--
-- Data for Name: leave_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_types (id, name, code, created_at) FROM stdin;
1	Annual Leave	AL	2026-06-01 13:55:40.036057+05:30
2	Sick Leave	SL	2026-06-01 13:55:40.048138+05:30
3	Casual Leave	CL	2026-06-01 13:55:40.048937+05:30
4	Compensatory Off	CO	2026-06-01 13:55:40.049483+05:30
5	Earned Leave	EL	2026-06-01 13:55:40.050189+05:30
\.


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.members (id, organization_id, user_id, role, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, recipient_id, kind, title, sub, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: organization_domains; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization_domains (id, tenant_id, domain, is_approved, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organization_join_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization_join_requests (id, tenant_id, email, name, company_domain, status, requester_user_id, reviewed_by_user_id, reviewed_at, created_invitation_id, note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, slug, logo, created_at, metadata) FROM stdin;
\.


--
-- Data for Name: regularisation_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.regularisation_requests (id, employee_id, date, original_issue, requested_punch_in, requested_punch_out, reason, proof_document_urls, status, approver_id, approver_remarks, decided_at, created_at, updated_at) FROM stdin;
1	7	2026-05-27	No punch recorded	09:15:00	18:30:00	Biometric not working, WFO confirmed by floor lead	{}	Pending	\N	\N	\N	2026-06-01 13:55:40.223225+05:30	2026-06-01 13:55:40.223225+05:30
2	6	2026-05-26	Missing punch-out	09:10:00	18:42:00	Forgot to punch out due to client call running over	{}	Pending	\N	\N	\N	2026-06-01 13:55:40.227559+05:30	2026-06-01 13:55:40.227559+05:30
3	1	2026-05-31	Marked late	09:05:00	18:30:00	Biometric error - calendar smoke test	{}	Approved	2	\N	2026-06-01 15:06:59.745+05:30	2026-06-01 15:06:58.209283+05:30	2026-06-01 15:06:59.747+05:30
\.


--
-- Data for Name: resignations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resignations (id, employee_id, last_working_date, reason, status, submitted_on, approved_by, approved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id, active_organization_id, impersonated_by) FROM stdin;
\.


--
-- Data for Name: two_factors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.two_factors (id, secret, backup_codes, user_id, verified) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, email_verified, image, created_at, updated_at, role, banned, ban_reason, ban_expires, two_factor_enabled) FROM stdin;
a0b5e150-d50d-4d15-8211-465fba02866d	Rahul Mehta	rahul@ileads.example	t	\N	2026-06-02 11:38:41.06	2026-06-02 11:38:41.06	user	f	\N	\N	f
7d64f393-bc98-4425-b654-eb003d24438f	Aarav Singh	aarav@ileads.example	t	\N	2026-06-02 11:38:41.13	2026-06-02 11:38:41.13	user	f	\N	\N	f
c52905f4-713a-4910-98c7-457632a3e676	Kavya Bhatt	kavya@ileads.example	t	\N	2026-06-02 11:38:41.196	2026-06-02 11:38:41.196	user	f	\N	\N	f
c98de65b-daa8-4e6c-a677-ec75e5d5238f	Rohan Thapa	rohan@ileads.example	t	\N	2026-06-02 11:38:41.261	2026-06-02 11:38:41.261	user	f	\N	\N	f
ef458343-434c-4e49-a1a5-bbf01085d370	Ishaan Pant	ishaan@ileads.example	t	\N	2026-06-02 11:38:41.326	2026-06-02 11:38:41.326	user	f	\N	\N	f
05c323f2-d149-464a-8668-01522c8b2177	Vikram Negi	vikram@ileads.example	t	\N	2026-06-02 11:38:41.392	2026-06-02 11:38:41.392	user	f	\N	\N	f
2c76d35a-7583-447c-9d8b-02c030c63c18	Priya Sharma	priya@ileads.example	t	\N	2026-06-02 11:38:41.457	2026-06-02 11:38:41.457	manager	f	\N	\N	f
\.


--
-- Data for Name: verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verifications (id, identifier, value, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Name: branches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.branches_id_seq', 1, true);


--
-- Name: broadcasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcasts_id_seq', 1, false);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 1, true);


--
-- Name: designations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.designations_id_seq', 6, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 7, true);


--
-- Name: employment_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employment_types_id_seq', 1, true);


--
-- Name: grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grades_id_seq', 5, true);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holidays_id_seq', 8, true);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 15, true);


--
-- Name: leave_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_types_id_seq', 5, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: regularisation_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regularisation_requests_id_seq', 3, true);


--
-- Name: resignations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resignations_id_seq', 1, false);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: apikeys apikeys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apikeys
    ADD CONSTRAINT apikeys_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (employee_id, date);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (employee_id, account_number);


--
-- Name: branches branches_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_name_key UNIQUE (name);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: designations designations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_name_key UNIQUE (name);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);


--
-- Name: employee_documents employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (employee_id, document_type);


--
-- Name: employees employees_aadhaar_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_aadhaar_no_key UNIQUE (aadhaar_no);


--
-- Name: employees employees_emp_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_emp_id_key UNIQUE (emp_id);


--
-- Name: employees employees_esic_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_esic_no_key UNIQUE (esic_no);


--
-- Name: employees employees_pan_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pan_no_key UNIQUE (pan_no);


--
-- Name: employees employees_personal_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_personal_email_key UNIQUE (personal_email);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_uan_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_uan_no_key UNIQUE (uan_no);


--
-- Name: employees employees_work_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_work_email_key UNIQUE (work_email);


--
-- Name: employment_types employment_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employment_types
    ADD CONSTRAINT employment_types_name_key UNIQUE (name);


--
-- Name: employment_types employment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employment_types
    ADD CONSTRAINT employment_types_pkey PRIMARY KEY (id);


--
-- Name: grades grades_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_code_key UNIQUE (code);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: leave_balances leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (employee_id, leave_type_id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_code_key UNIQUE (code);


--
-- Name: leave_types leave_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_name_key UNIQUE (name);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_domains organization_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_domains
    ADD CONSTRAINT organization_domains_pkey PRIMARY KEY (id);


--
-- Name: organization_join_requests organization_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_join_requests
    ADD CONSTRAINT organization_join_requests_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: regularisation_requests regularisation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regularisation_requests
    ADD CONSTRAINT regularisation_requests_pkey PRIMARY KEY (id);


--
-- Name: resignations resignations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resignations
    ADD CONSTRAINT resignations_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);


--
-- Name: two_factors two_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.two_factors
    ADD CONSTRAINT two_factors_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_user_id_idx ON public.accounts USING btree (user_id);


--
-- Name: apikeys_config_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX apikeys_config_id_idx ON public.apikeys USING btree (config_id);


--
-- Name: apikeys_key_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX apikeys_key_idx ON public.apikeys USING btree (key);


--
-- Name: apikeys_reference_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX apikeys_reference_id_idx ON public.apikeys USING btree (reference_id);


--
-- Name: idx_att_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_att_date ON public.attendance_records USING btree (date);


--
-- Name: idx_att_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_att_status ON public.attendance_records USING btree (status);


--
-- Name: idx_bc_dept_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bc_dept_ids ON public.broadcasts USING gin (target_dept_ids);


--
-- Name: idx_bc_emp_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bc_emp_ids ON public.broadcasts USING gin (target_emp_ids);


--
-- Name: idx_emp_branch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_branch ON public.employees USING btree (branch_id);


--
-- Name: idx_emp_dept; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_dept ON public.employees USING btree (department_id);


--
-- Name: idx_emp_desig; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_desig ON public.employees USING btree (designation_id);


--
-- Name: idx_emp_emp_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_emp_type ON public.employees USING btree (employment_type_id);


--
-- Name: idx_emp_grade; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_grade ON public.employees USING btree (grade_id);


--
-- Name: idx_emp_join_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_join_date ON public.employees USING btree (joining_date);


--
-- Name: idx_emp_manager; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_manager ON public.employees USING btree (reporting_manager_id);


--
-- Name: idx_emp_reporting_chain; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_reporting_chain ON public.employees USING gin (reporting_chain);


--
-- Name: idx_emp_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_status ON public.employees USING btree (employee_status);


--
-- Name: idx_emp_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_user_id ON public.employees USING btree (user_id);


--
-- Name: idx_holidays_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_holidays_date ON public.holidays USING btree (date);


--
-- Name: idx_lr_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lr_dates ON public.leave_requests USING btree (from_date, to_date);


--
-- Name: idx_lr_emp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lr_emp ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_lr_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lr_status ON public.leave_requests USING btree (status);


--
-- Name: idx_notif_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notif_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_recipient ON public.notifications USING btree (recipient_id, is_read);


--
-- Name: invitations_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invitations_email_idx ON public.invitations USING btree (email);


--
-- Name: invitations_id_organization_id_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX invitations_id_organization_id_uidx ON public.invitations USING btree (id, organization_id);


--
-- Name: invitations_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invitations_organization_id_idx ON public.invitations USING btree (organization_id);


--
-- Name: members_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX members_organization_id_idx ON public.members USING btree (organization_id);


--
-- Name: members_organization_user_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX members_organization_user_uidx ON public.members USING btree (organization_id, user_id);


--
-- Name: members_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX members_user_id_idx ON public.members USING btree (user_id);


--
-- Name: organization_domains_domain_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX organization_domains_domain_uidx ON public.organization_domains USING btree (domain);


--
-- Name: organization_domains_tenant_domain_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX organization_domains_tenant_domain_uidx ON public.organization_domains USING btree (tenant_id, domain);


--
-- Name: organization_domains_tenant_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX organization_domains_tenant_id_idx ON public.organization_domains USING btree (tenant_id);


--
-- Name: organization_join_requests_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX organization_join_requests_email_idx ON public.organization_join_requests USING btree (email);


--
-- Name: organization_join_requests_pending_email_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX organization_join_requests_pending_email_uidx ON public.organization_join_requests USING btree (tenant_id, email) WHERE (status = 'pending'::public.organization_join_request_status);


--
-- Name: organization_join_requests_tenant_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX organization_join_requests_tenant_status_idx ON public.organization_join_requests USING btree (tenant_id, status);


--
-- Name: organizations_slug_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX organizations_slug_uidx ON public.organizations USING btree (slug);


--
-- Name: sessions_active_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_active_organization_id_idx ON public.sessions USING btree (active_organization_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: two_factors_secret_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX two_factors_secret_idx ON public.two_factors USING btree (secret);


--
-- Name: two_factors_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX two_factors_user_id_idx ON public.two_factors USING btree (user_id);


--
-- Name: uq_one_primary_bank_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_one_primary_bank_account ON public.bank_accounts USING btree (employee_id) WHERE (is_primary = true);


--
-- Name: verifications_identifier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX verifications_identifier_idx ON public.verifications USING btree (identifier);


--
-- Name: accounts accounts_user_id_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_employee_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_employees_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_y7vNYPKIyPGV_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "attendance_records_y7vNYPKIyPGV_fkey" FOREIGN KEY (regularisation_id) REFERENCES public.regularisation_requests(id) ON DELETE SET NULL;


--
-- Name: bank_accounts bank_accounts_employee_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_employee_id_employees_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: broadcasts broadcasts_sender_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_sender_id_employees_id_fkey FOREIGN KEY (sender_id) REFERENCES public.employees(id) ON DELETE RESTRICT;


--
-- Name: departments departments_manager_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_manager_id_employees_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: designations designations_department_id_departments_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_department_id_departments_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: designations designations_grade_max_id_grades_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_grade_max_id_grades_id_fkey FOREIGN KEY (grade_max_id) REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: designations designations_grade_min_id_grades_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_grade_min_id_grades_id_fkey FOREIGN KEY (grade_min_id) REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: employee_documents employee_documents_employee_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_employee_id_employees_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_verified_by_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_verified_by_employees_id_fkey FOREIGN KEY (verified_by) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: employees employees_branch_id_branches_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_branch_id_branches_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: employees employees_department_id_departments_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_departments_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_designation_id_designations_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_designation_id_designations_id_fkey FOREIGN KEY (designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;


--
-- Name: employees employees_employment_type_id_employment_types_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employment_type_id_employment_types_id_fkey FOREIGN KEY (employment_type_id) REFERENCES public.employment_types(id) ON DELETE SET NULL;


--
-- Name: employees employees_grade_id_grades_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_grade_id_grades_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE SET NULL;


--
-- Name: employees employees_reporting_manager_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_reporting_manager_id_employees_id_fkey FOREIGN KEY (reporting_manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: holidays holidays_branch_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_branch_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_inviter_id_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_inviter_id_users_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_organization_id_organizations_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_organization_id_organizations_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: leave_balances leave_balances_employee_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_employee_id_employees_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: leave_balances leave_balances_leave_type_id_leave_types_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_leave_type_id_leave_types_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_employee_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_employees_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_hr_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_hr_id_employees_id_fkey FOREIGN KEY (hr_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_leave_type_id_leave_types_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_leave_type_id_leave_types_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id) ON DELETE RESTRICT;


--
-- Name: leave_requests leave_requests_manager_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_manager_id_employees_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: members members_organization_id_organizations_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_organization_id_organizations_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: members members_user_id_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_user_id_users_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_employees_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: organization_domains organization_domains_tenant_id_organizations_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_domains
    ADD CONSTRAINT organization_domains_tenant_id_organizations_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_join_requests organization_join_requests_invitation_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_join_requests
    ADD CONSTRAINT organization_join_requests_invitation_tenant_fk FOREIGN KEY (created_invitation_id, tenant_id) REFERENCES public.invitations(id, organization_id);


--
-- Name: organization_join_requests organization_join_requests_requester_user_id_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_join_requests
    ADD CONSTRAINT organization_join_requests_requester_user_id_users_id_fkey FOREIGN KEY (requester_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: organization_join_requests organization_join_requests_reviewed_by_user_id_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_join_requests
    ADD CONSTRAINT organization_join_requests_reviewed_by_user_id_users_id_fkey FOREIGN KEY (reviewed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: organization_join_requests organization_join_requests_tenant_id_organizations_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_join_requests
    ADD CONSTRAINT organization_join_requests_tenant_id_organizations_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: regularisation_requests regularisation_requests_approver_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regularisation_requests
    ADD CONSTRAINT regularisation_requests_approver_id_employees_id_fkey FOREIGN KEY (approver_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: regularisation_requests regularisation_requests_employee_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regularisation_requests
    ADD CONSTRAINT regularisation_requests_employee_id_employees_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: resignations resignations_approved_by_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resignations
    ADD CONSTRAINT resignations_approved_by_employees_id_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: resignations resignations_employee_id_employees_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resignations
    ADD CONSTRAINT resignations_employee_id_employees_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_active_organization_id_organizations_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_active_organization_id_organizations_id_fkey FOREIGN KEY (active_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_impersonated_by_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_impersonated_by_users_id_fkey FOREIGN KEY (impersonated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: two_factors two_factors_user_id_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.two_factors
    ADD CONSTRAINT two_factors_user_id_users_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nV9XP2AmDYnO9WruW8wFUCbLdsm8zbXsPeL4f2hj43XjIKu5VdQbKRVaAPqN1bP

