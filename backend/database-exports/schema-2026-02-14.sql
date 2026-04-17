--
-- PostgreSQL database dump
--

\restrict 1q2O0NVnNWzhXshHmPgMO4rS6QcfmeRaA2J5ax68fNBTDTs9W3PM82qDRwUFacj

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.12 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ApprovalLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalLevel" AS ENUM (
    'OFFICER',
    'MANAGER',
    'HQ'
);


--
-- Name: BankTaskType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BankTaskType" AS ENUM (
    'LOAN_APPROVAL',
    'DISBURSEMENT',
    'COLLECTION',
    'CUSTOMER_VISIT',
    'DOCUMENT_REVIEW',
    'CREDIT_REVIEW',
    'REPORT_SUBMISSION',
    'OTHER'
);


--
-- Name: BranchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BranchStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: ContactMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContactMethod" AS ENUM (
    'PHONE',
    'LINE',
    'VISIT',
    'EMAIL',
    'OTHER'
);


--
-- Name: ContactStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContactStatus" AS ENUM (
    'CONTACTED',
    'PROMISED_TO_PAY',
    'REQUEST_EXTENSION',
    'UNREACHABLE',
    'ALREADY_PAID'
);


--
-- Name: CustomerStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: DisbursementStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DisbursementStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'DISBURSED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: DocumentReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentReviewStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: EventCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EventCategory" AS ENUM (
    'LOAN_RELATED',
    'CUSTOMER_VISIT',
    'INTERNAL_MEETING',
    'TRAINING',
    'HOLIDAY',
    'OTHER'
);


--
-- Name: EventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EventType" AS ENUM (
    'MEETING',
    'PAYMENT_DUE',
    'FOLLOW_UP',
    'APPOINTMENT',
    'REMINDER',
    'HOLIDAY',
    'OTHER'
);


--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseCategory" AS ENUM (
    'OFFICE_SUPPLIES',
    'UTILITIES',
    'TRAVEL',
    'MARKETING',
    'MAINTENANCE',
    'OTHER'
);


--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REIMBURSED'
);


--
-- Name: InterestRateType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InterestRateType" AS ENUM (
    'FIXED',
    'VARIABLE',
    'MIXED',
    'TIERED'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'PENDING',
    'DRAFT',
    'SENT',
    'VIEWED',
    'PAID',
    'OVERDUE',
    'EXPIRED',
    'CANCELLED'
);


--
-- Name: LoanStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LoanStatus" AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'DISBURSED',
    'ACTIVE',
    'CLOSED',
    'DEFAULTED',
    'NPL'
);


--
-- Name: LoanType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LoanType" AS ENUM (
    'SHORT_TERM',
    'MEDIUM_TERM',
    'LONG_TERM',
    'REVOLVING',
    'MIXED'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'LOAN_APPROVED',
    'LOAN_REJECTED',
    'PAYMENT_DUE',
    'PAYMENT_OVERDUE',
    'EXPENSE_APPROVED',
    'EXPENSE_REJECTED',
    'SYSTEM_ALERT',
    'REMINDER',
    'OTHER'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'TRANSFER',
    'CHEQUE',
    'OTHER'
);


--
-- Name: PaymentScheduleStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentScheduleStatus" AS ENUM (
    'UNPAID',
    'PAID',
    'PARTIAL',
    'OVERDUE'
);


--
-- Name: PaymentTimelineEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentTimelineEventType" AS ENUM (
    'INVOICE_GENERATION',
    'REMINDER_1',
    'REMINDER_2',
    'OVERDUE_UPDATE',
    'PENALTY_INVOICE',
    'NPL_STATUS_UPDATE'
);


--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentType" AS ENUM (
    'EARLY',
    'ON_TIME',
    'LATE'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED'
);


--
-- Name: PromptPayQRStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PromptPayQRStatus" AS ENUM (
    'ACTIVE',
    'USED',
    'EXPIRED'
);


--
-- Name: ReceiptStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReceiptStatus" AS ENUM (
    'ISSUED',
    'SENT',
    'VIEWED',
    'CANCELLED'
);


--
-- Name: ThaiPaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ThaiPaymentMethod" AS ENUM (
    'PROMPTPAY',
    'QR_CODE',
    'BANK_TRANSFER',
    'CASH_AT_BRANCH',
    'CREDIT_CARD',
    'CHEQUE',
    'DIRECT_DEBIT'
);


--
-- Name: TimelineEventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TimelineEventStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'SKIPPED',
    'CANCELLED'
);


--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REVERSED'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER',
    'LOAN_DISBURSEMENT',
    'LOAN_PAYMENT',
    'FEE',
    'INTEREST'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'MANAGER',
    'OFFICER',
    'USER'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'LOCKED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: aging_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aging_analysis (
    id text NOT NULL,
    loan_id text NOT NULL,
    customer_id text NOT NULL,
    branch_id text NOT NULL,
    current_age integer DEFAULT 0 NOT NULL,
    aging_bucket character varying(20) NOT NULL,
    principal_overdue numeric(15,2) DEFAULT 0,
    interest_overdue numeric(15,2) DEFAULT 0,
    penalty_overdue numeric(15,2) DEFAULT 0,
    total_overdue numeric(15,2) DEFAULT 0,
    collection_agent_id text,
    collection_strategy character varying(50),
    next_action_date date,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone
);


--
-- Name: aml_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aml_checks (
    id text NOT NULL,
    customer_id text NOT NULL,
    check_type character varying(50) NOT NULL,
    check_result character varying(20) NOT NULL,
    match_score numeric(5,2),
    matched_names jsonb,
    check_data jsonb,
    performed_by text,
    performed_at timestamp(3) without time zone,
    reviewed_by text,
    reviewed_at timestamp(3) without time zone,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: approval_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_limits (
    id text NOT NULL,
    role public."UserRole" NOT NULL,
    min_amount numeric(15,2) DEFAULT 0 NOT NULL,
    max_amount numeric(15,2),
    approval_level text NOT NULL,
    requires_next_level boolean DEFAULT false NOT NULL,
    sla_hours integer DEFAULT 24 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    changes jsonb,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: blocked_ips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_ips (
    id text NOT NULL,
    ip_address text NOT NULL,
    reason text NOT NULL,
    blocked_by text,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE blocked_ips; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.blocked_ips IS 'รายการ IP addresses ที่ถูก block';


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    status public."BranchStatus" DEFAULT 'ACTIVE'::public."BranchStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: budget_consumption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_consumption (
    id text NOT NULL,
    product_budget_id text NOT NULL,
    loan_id text NOT NULL,
    branch_id text NOT NULL,
    requested_amount numeric(15,2) NOT NULL,
    approved_amount numeric(15,2) NOT NULL,
    disbursed_amount numeric(15,2) DEFAULT 0,
    consumption_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    consumption_date date NOT NULL,
    consumption_time timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_by text,
    released_amount numeric(15,2) DEFAULT 0,
    released_at timestamp(3) without time zone,
    released_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone,
    idempotency_key text
);


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id text NOT NULL,
    branch_id text,
    created_by text NOT NULL,
    title text NOT NULL,
    description text,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone,
    all_day boolean DEFAULT false NOT NULL,
    event_type public."EventType" NOT NULL,
    category public."EventCategory",
    loan_id text,
    customer_id text,
    recurring boolean DEFAULT false NOT NULL,
    recurrence_rule text,
    reminder_minutes integer[] DEFAULT ARRAY[]::integer[],
    location text,
    attendees text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: collection_workflow_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_workflow_steps (
    id text NOT NULL,
    days_overdue_from integer NOT NULL,
    days_overdue_to integer,
    action_type character varying(50) NOT NULL,
    template_id text,
    priority character varying(20) NOT NULL,
    assigned_role character varying(50) NOT NULL,
    sla_hours integer NOT NULL,
    is_active boolean DEFAULT true,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: contact_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_logs (
    id text NOT NULL,
    customer_id text NOT NULL,
    loan_id text,
    officer_id text NOT NULL,
    contact_date timestamp(3) without time zone NOT NULL,
    contact_status public."ContactStatus" NOT NULL,
    contact_method public."ContactMethod" NOT NULL,
    notes text NOT NULL,
    promised_date timestamp(3) without time zone,
    task_id text,
    next_follow_up_date timestamp(3) without time zone,
    outcome public."ContactStatus",
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: conversation_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_states (
    id text NOT NULL,
    line_user_id text NOT NULL,
    flow text NOT NULL,
    step text NOT NULL,
    data jsonb,
    state text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: credit_line_drawdowns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_line_drawdowns (
    id text NOT NULL,
    credit_line_id text NOT NULL,
    drawdown_number character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    purpose text NOT NULL,
    drawdown_date date NOT NULL,
    maturity_date date NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: credit_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_lines (
    id text NOT NULL,
    customer_id text NOT NULL,
    credit_line_number character varying(50) NOT NULL,
    approved_limit numeric(15,2) NOT NULL,
    current_balance numeric(15,2) DEFAULT 0,
    available_balance numeric(15,2) DEFAULT 0,
    utilization_rate numeric(5,2) DEFAULT 0,
    interest_rate numeric(5,2) NOT NULL,
    start_date date NOT NULL,
    expiry_date date NOT NULL,
    review_date date,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone
);


--
-- Name: customer_active_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_active_products (
    id text NOT NULL,
    customer_id text NOT NULL,
    loan_product_id text NOT NULL,
    loan_id text NOT NULL,
    activated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deactivated_at timestamp(3) without time zone,
    status text DEFAULT 'ACTIVE'::text NOT NULL
);


--
-- Name: customer_bank_statement_months; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_bank_statement_months (
    id text NOT NULL,
    statement_id text NOT NULL,
    month text NOT NULL,
    withdraw_count integer DEFAULT 0 NOT NULL,
    withdraw_amount numeric(15,2) DEFAULT 0 NOT NULL,
    deposit_count integer DEFAULT 0 NOT NULL,
    deposit_amount numeric(15,2) DEFAULT 0 NOT NULL,
    balance numeric(15,2) DEFAULT 0 NOT NULL
);


--
-- Name: customer_bank_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_bank_statements (
    id text NOT NULL,
    customer_id text NOT NULL,
    bank_name text,
    account_number text,
    account_name text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_business_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_business_histories (
    id text NOT NULL,
    customer_id text NOT NULL,
    type text NOT NULL,
    content text,
    details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: customer_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_comments (
    id text NOT NULL,
    customer_id text NOT NULL,
    topic text,
    content text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: customer_credit_bureaus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_credit_bureaus (
    id text NOT NULL,
    customer_id text NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    check_date timestamp(3) without time zone,
    total_limit numeric(15,2),
    total_outstanding numeric(15,2),
    number_of_accounts integer,
    npl_status boolean DEFAULT false NOT NULL,
    accounts jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_financial_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_financial_statements (
    id text NOT NULL,
    customer_id text NOT NULL,
    year text NOT NULL,
    revenue numeric(15,2),
    gross_profit numeric(15,2),
    net_profit numeric(15,2),
    cost_of_sales numeric(15,2),
    selling_expenses numeric(15,2),
    admin_expenses numeric(15,2),
    ebitda numeric(15,2),
    total_assets numeric(15,2),
    total_liabilities numeric(15,2),
    total_equity numeric(15,2),
    current_assets numeric(15,2),
    non_current_assets numeric(15,2),
    current_liabilities numeric(15,2),
    non_current_liabilities numeric(15,2),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_investments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_investments (
    id text NOT NULL,
    customer_id text NOT NULL,
    description text NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    own_share numeric(15,2) DEFAULT 0 NOT NULL,
    loan_share numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_projections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_projections (
    id text NOT NULL,
    customer_id text NOT NULL,
    year text NOT NULL,
    revenue numeric(15,2),
    cost_of_sales numeric(15,2),
    gross_profit numeric(15,2),
    expenses numeric(15,2),
    net_profit numeric(15,2),
    dscr numeric(5,2),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_vat_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_vat_records (
    id text NOT NULL,
    customer_id text NOT NULL,
    month text NOT NULL,
    year integer,
    sales_amount numeric(15,2) DEFAULT 0 NOT NULL,
    sales_tax numeric(15,2) DEFAULT 0 NOT NULL,
    purchase_amount numeric(15,2) DEFAULT 0 NOT NULL,
    purchase_tax numeric(15,2) DEFAULT 0 NOT NULL,
    tax_payable numeric(15,2) DEFAULT 0 NOT NULL,
    details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: customer_working_capitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_working_capitals (
    id text NOT NULL,
    customer_id text NOT NULL,
    total_limit numeric(15,2) DEFAULT 0 NOT NULL,
    used_limit numeric(15,2) DEFAULT 0 NOT NULL,
    stock_amount numeric(15,2),
    receivable_days integer,
    payable_days integer,
    details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id text NOT NULL,
    user_id text,
    branch_id text NOT NULL,
    customer_code text NOT NULL,
    business_name text NOT NULL,
    business_type text,
    business_registration_date date,
    business_registration_type character varying(50),
    registered_capital numeric(15,2),
    business_size character varying(20),
    industry_code character varying(10),
    business_age_years integer,
    number_of_employees integer,
    phone text NOT NULL,
    email text,
    address text,
    business_address text,
    business_phone text,
    thai_id text,
    tax_id text NOT NULL,
    avatar text,
    shareholders jsonb,
    signatories jsonb,
    annual_revenue numeric(15,2),
    net_profit numeric(15,2),
    total_assets numeric(15,2),
    total_liabilities numeric(15,2),
    debt_to_equity_ratio numeric(5,2),
    ai_extracted_data jsonb,
    ai_confidence_score numeric(5,2),
    ai_processed_at timestamp(3) without time zone,
    ai_warnings text[] DEFAULT ARRAY[]::text[],
    status public."CustomerStatus" DEFAULT 'ACTIVE'::public."CustomerStatus" NOT NULL,
    document_complete boolean DEFAULT false NOT NULL,
    line_user_id text,
    line_linked_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by text NOT NULL
);


--
-- Name: data_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_access_logs (
    id text NOT NULL,
    user_id text NOT NULL,
    customer_id text NOT NULL,
    access_type character varying(50) NOT NULL,
    access_path text NOT NULL,
    accessed_fields text[],
    purpose text,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id text NOT NULL,
    customer_id text,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type text NOT NULL,
    file_hash text NOT NULL,
    ai_processed boolean DEFAULT false NOT NULL,
    ai_status text,
    extracted_data jsonb,
    confidence_score numeric(5,2),
    enhanced_data jsonb,
    document_subtype text,
    processing_version text DEFAULT 'v1'::text,
    review_status public."DocumentReviewStatus" DEFAULT 'PENDING'::public."DocumentReviewStatus" NOT NULL,
    reviewed_by text,
    reviewed_at timestamp(3) without time zone,
    review_notes text,
    rejected_reason text,
    uploaded_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    branch_id text NOT NULL,
    created_by text NOT NULL,
    category public."ExpenseCategory" NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text NOT NULL,
    receipt_path text,
    status public."ExpenseStatus" DEFAULT 'PENDING'::public."ExpenseStatus" NOT NULL,
    approved_by text,
    approved_at timestamp(3) without time zone,
    rejected_by text,
    rejected_at timestamp(3) without time zone,
    rejected_reason text,
    reimbursed boolean DEFAULT false NOT NULL,
    reimbursed_at timestamp(3) without time zone,
    reimbursed_by text,
    expense_date timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: interest_rate_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interest_rate_tiers (
    id text NOT NULL,
    loan_product_id text,
    tier_name text NOT NULL,
    min_amount numeric(15,2) NOT NULL,
    max_amount numeric(15,2),
    interest_rate numeric(5,4) NOT NULL,
    grace_period_days integer DEFAULT 0 NOT NULL,
    effective_from timestamp(3) without time zone NOT NULL,
    effective_until timestamp(3) without time zone,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: invoice_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_access_logs (
    id text NOT NULL,
    resource_id text NOT NULL,
    customer_id text NOT NULL,
    success boolean DEFAULT false NOT NULL,
    attempted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    payment_schedule_id text NOT NULL,
    loan_id text NOT NULL,
    customer_id text NOT NULL,
    invoice_number text NOT NULL,
    invoice_date timestamp(3) without time zone NOT NULL,
    due_date timestamp(3) without time zone NOT NULL,
    invoice_data jsonb NOT NULL,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    sent_at timestamp(3) without time zone,
    sent_via text,
    viewed_at timestamp(3) without time zone,
    generated_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: loan_approval_workflow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_approval_workflow (
    id text NOT NULL,
    loan_id text NOT NULL,
    approval_level integer DEFAULT 1 NOT NULL,
    approver_id text,
    approval_status character varying(20) DEFAULT 'PENDING'::character varying,
    approved_amount numeric(15,2),
    approval_notes text,
    sla_deadline timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone
);


--
-- Name: loan_disbursements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_disbursements (
    id text NOT NULL,
    loan_id text NOT NULL,
    disbursement_no integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    purpose text NOT NULL,
    requested_date timestamp(3) without time zone NOT NULL,
    status public."DisbursementStatus" DEFAULT 'PENDING'::public."DisbursementStatus" NOT NULL,
    approved_by text,
    approved_at timestamp(3) without time zone,
    rejected_by text,
    rejected_at timestamp(3) without time zone,
    rejected_reason text,
    disbursed_by text,
    disbursed_at timestamp(3) without time zone,
    disbursement_method text,
    reference_no text,
    next_disbursement_date timestamp(3) without time zone,
    notes text,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    idempotency_key text
);


--
-- Name: loan_interest_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_interest_history (
    id text NOT NULL,
    loan_id text NOT NULL,
    payment_number integer NOT NULL,
    outstanding_balance numeric(15,2) NOT NULL,
    applied_rate numeric(5,4) NOT NULL,
    tier_name text,
    grace_period_days integer DEFAULT 0 NOT NULL,
    interest_amount numeric(15,2) NOT NULL,
    calculated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_date timestamp(3) without time zone NOT NULL
);


--
-- Name: loan_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loan_products (
    id text NOT NULL,
    product_code text NOT NULL,
    product_name text NOT NULL,
    product_name_en text,
    description text,
    purpose text[] DEFAULT ARRAY[]::text[],
    eligibility text[] DEFAULT ARRAY[]::text[],
    target_business text[] DEFAULT ARRAY[]::text[],
    min_revenue numeric(15,2),
    max_revenue numeric(15,2),
    min_years_in_business integer,
    min_loan_amount numeric(15,2),
    max_loan_amount numeric(15,2) NOT NULL,
    total_project_budget numeric(15,2),
    interest_rate_type public."InterestRateType" NOT NULL,
    interest_rate_year_1_3 numeric(5,2),
    interest_rate_year_4_plus numeric(5,2),
    interest_rate_formula text,
    government_subsidy boolean DEFAULT false NOT NULL,
    subsidy_details text,
    loan_type public."LoanType" NOT NULL,
    max_term_months integer NOT NULL,
    grace_period_months integer DEFAULT 0,
    collateral_required boolean DEFAULT true NOT NULL,
    collateral_details text,
    guarantee_options text[] DEFAULT ARRAY[]::text[],
    benefits text[] DEFAULT ARRAY[]::text[],
    fee_waivers text[] DEFAULT ARRAY[]::text[],
    project_start_date timestamp(3) without time zone,
    project_end_date timestamp(3) without time zone,
    status public."ProductStatus" DEFAULT 'ACTIVE'::public."ProductStatus" NOT NULL,
    is_popular boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loans (
    id text NOT NULL,
    customer_id text NOT NULL,
    branch_id text NOT NULL,
    officer_id text NOT NULL,
    contract_number text,
    principal numeric(15,2) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    term_months integer NOT NULL,
    current_principal numeric(15,2),
    interest_calculation_method text DEFAULT 'DYNAMIC_PRINCIPAL'::text,
    last_interest_calculation_date timestamp(3) without time zone,
    accumulated_interest numeric(15,2) DEFAULT 0,
    payment_day integer DEFAULT 1 NOT NULL,
    first_payment_date timestamp(3) without time zone,
    payment_day_adjustment text DEFAULT 'LAST_DAY'::text,
    dscr numeric(5,2),
    dscr_status text,
    monthly_payment numeric(15,2),
    total_interest numeric(15,2),
    allow_early_payment boolean DEFAULT true,
    early_payment_penalty_rate numeric(5,2) DEFAULT 0,
    status public."LoanStatus" DEFAULT 'PENDING_APPROVAL'::public."LoanStatus" NOT NULL,
    sla_status character varying(20),
    sla_deadline timestamp(3) without time zone,
    approved_by text,
    approved_at timestamp(3) without time zone,
    rejected_by text,
    rejected_at timestamp(3) without time zone,
    rejected_reason text,
    approval_level public."ApprovalLevel" NOT NULL,
    current_approval_level public."ApprovalLevel",
    approval_history jsonb,
    disbursement_date timestamp(3) without time zone,
    maturity_date timestamp(3) without time zone,
    outstanding_balance numeric(15,2) DEFAULT 0 NOT NULL,
    next_payment_date timestamp(3) without time zone,
    next_payment_amount numeric(15,2),
    last_payment_date timestamp(3) without time zone,
    overdue_days integer DEFAULT 0 NOT NULL,
    total_disbursed numeric(15,2) DEFAULT 0 NOT NULL,
    remaining_amount numeric(15,2),
    product_config_id text,
    product_config jsonb,
    loan_product_id text,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_loans_accumulated_interest_positive CHECK (((accumulated_interest IS NULL) OR (accumulated_interest >= (0)::numeric))),
    CONSTRAINT chk_loans_current_principal_positive CHECK (((current_principal IS NULL) OR (current_principal >= (0)::numeric))),
    CONSTRAINT chk_loans_interest_rate_range CHECK (((interest_rate >= (0)::numeric) AND (interest_rate <= (100)::numeric))),
    CONSTRAINT chk_loans_outstanding_balance_positive CHECK ((outstanding_balance >= (0)::numeric)),
    CONSTRAINT chk_loans_principal_positive CHECK ((principal > (0)::numeric)),
    CONSTRAINT chk_loans_term_months_positive CHECK (((term_months > 0) AND (term_months <= 600))),
    CONSTRAINT chk_loans_total_disbursed_max CHECK ((total_disbursed <= principal)),
    CONSTRAINT chk_loans_total_disbursed_positive CHECK ((total_disbursed >= (0)::numeric))
);


--
-- Name: next_payment_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.next_payment_invoices (
    id text NOT NULL,
    invoice_number text NOT NULL,
    loan_id text NOT NULL,
    customer_id text NOT NULL,
    payment_schedule_id text NOT NULL,
    invoice_data jsonb NOT NULL,
    status public."InvoiceStatus" DEFAULT 'PENDING'::public."InvoiceStatus" NOT NULL,
    generated_by text NOT NULL,
    sent_at timestamp(3) without time zone,
    sent_via text,
    sent_by text,
    paid_at timestamp(3) without time zone,
    paid_amount numeric(15,2),
    payment_method text,
    receipt_number text,
    valid_until timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: notification_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_actions (
    id text NOT NULL,
    notification_type text NOT NULL,
    action_id text NOT NULL,
    label text NOT NULL,
    link text NOT NULL,
    required_roles text[],
    required_permissions text[] DEFAULT ARRAY[]::text[],
    requires_confirmation boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: notification_audience_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_audience_rules (
    id text NOT NULL,
    notification_type text NOT NULL,
    allowed_roles text[],
    allowed_branches text[] DEFAULT ARRAY['all'::text],
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    metadata jsonb,
    read boolean DEFAULT false NOT NULL,
    read_at timestamp(3) without time zone,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    event_id text,
    dedup_key text,
    archived boolean DEFAULT false NOT NULL,
    archived_at timestamp(3) without time zone,
    audience_roles text[] DEFAULT ARRAY[]::text[],
    action_id text,
    action_label text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payment_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_receipts (
    id text NOT NULL,
    receipt_number text NOT NULL,
    payment_id text NOT NULL,
    loan_id text NOT NULL,
    customer_id text NOT NULL,
    invoice_id text,
    amount numeric(15,2) NOT NULL,
    payment_date timestamp(3) without time zone NOT NULL,
    payment_method text NOT NULL,
    receipt_data jsonb NOT NULL,
    status public."ReceiptStatus" DEFAULT 'ISSUED'::public."ReceiptStatus" NOT NULL,
    issued_by text NOT NULL,
    issued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sent_at timestamp(3) without time zone,
    sent_via text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: payment_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_schedules (
    id text NOT NULL,
    loan_id text NOT NULL,
    payment_number integer NOT NULL,
    payment_date timestamp(3) without time zone NOT NULL,
    principal_amount numeric(15,2) NOT NULL,
    interest_amount numeric(15,2) NOT NULL,
    total_payment numeric(15,2) NOT NULL,
    remaining_balance numeric(15,2) NOT NULL,
    status public."PaymentScheduleStatus" DEFAULT 'UNPAID'::public."PaymentScheduleStatus" NOT NULL,
    paid_at timestamp(3) without time zone,
    statement_number text,
    days_overdue integer DEFAULT 0 NOT NULL,
    penalty_amount numeric(15,2) DEFAULT 0 NOT NULL,
    compound_interest_amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_payment_schedules_interest_positive CHECK ((interest_amount >= (0)::numeric)),
    CONSTRAINT chk_payment_schedules_principal_positive CHECK ((principal_amount >= (0)::numeric)),
    CONSTRAINT chk_payment_schedules_total_positive CHECK ((total_payment >= (0)::numeric))
);


--
-- Name: COLUMN payment_schedules.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_schedules.version IS 'Optimistic locking version - increment on every update';


--
-- Name: payment_timeline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_timeline_events (
    id text NOT NULL,
    loan_id text NOT NULL,
    payment_schedule_id text NOT NULL,
    event_type public."PaymentTimelineEventType" NOT NULL,
    scheduled_date timestamp(3) without time zone NOT NULL,
    executed_at timestamp(3) without time zone,
    status public."TimelineEventStatus" DEFAULT 'PENDING'::public."TimelineEventStatus" NOT NULL,
    metadata jsonb,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    next_retry_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    loan_id text NOT NULL,
    payment_schedule_id text,
    amount numeric(15,2) NOT NULL,
    payment_date timestamp(3) without time zone NOT NULL,
    payment_method character varying(50) NOT NULL,
    payment_type public."PaymentType" NOT NULL,
    interest_saved numeric(15,2),
    penalty_amount numeric(15,2),
    notes text,
    reference text,
    payment_gateway character varying(50),
    gateway_reference text,
    gateway_response jsonb,
    bank_name character varying(100),
    account_number character varying(20),
    verified boolean DEFAULT false,
    verified_by text,
    verified_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    idempotency_key text
);


--
-- Name: COLUMN payments.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.version IS 'Optimistic locking version - increment on every update';


--
-- Name: penalty_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.penalty_rules (
    id text NOT NULL,
    loan_product_id text,
    rule_name text NOT NULL,
    days_overdue_from integer DEFAULT 1 NOT NULL,
    days_overdue_to integer,
    penalty_type text NOT NULL,
    penalty_rate numeric(5,2),
    penalty_amount numeric(15,2),
    compound_interest boolean DEFAULT false NOT NULL,
    compound_rate numeric(5,2),
    is_default boolean DEFAULT false NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: principal_prepayments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.principal_prepayments (
    id text NOT NULL,
    loan_id text NOT NULL,
    payment_schedule_id text,
    amount numeric(15,2) NOT NULL,
    prepayment_date date NOT NULL,
    interest_saved numeric(15,2) DEFAULT 0,
    new_monthly_payment numeric(15,2),
    new_maturity_date date,
    penalty_amount numeric(15,2) DEFAULT 0,
    processed_by text,
    processed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: privacy_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_consents (
    id text NOT NULL,
    customer_id text NOT NULL,
    consent_type character varying(100) NOT NULL,
    consent_version character varying(20) NOT NULL,
    consent_text text NOT NULL,
    given boolean DEFAULT false NOT NULL,
    given_at timestamp(3) without time zone,
    withdrawn boolean DEFAULT false,
    withdrawn_at timestamp(3) without time zone,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_budgets (
    id text NOT NULL,
    product_id text NOT NULL,
    product_code text NOT NULL,
    product_name text NOT NULL,
    fiscal_year integer NOT NULL,
    quarter integer,
    total_budget_amount numeric(15,2) NOT NULL,
    committed_amount numeric(15,2) DEFAULT 0,
    disbursed_amount numeric(15,2) DEFAULT 0,
    pending_amount numeric(15,2) DEFAULT 0,
    available_amount numeric(15,2) DEFAULT 0,
    utilization_rate numeric(5,2) DEFAULT 0,
    warning_threshold numeric(5,2) DEFAULT 80.00,
    critical_threshold numeric(5,2) DEFAULT 95.00,
    budget_status character varying(20) DEFAULT 'ACTIVE'::character varying,
    budget_owner text,
    notes text,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_product_budgets_available_positive CHECK ((available_amount >= (0)::numeric)),
    CONSTRAINT chk_product_budgets_committed_positive CHECK ((committed_amount >= (0)::numeric)),
    CONSTRAINT chk_product_budgets_disbursed_positive CHECK ((disbursed_amount >= (0)::numeric)),
    CONSTRAINT chk_product_budgets_total_balance CHECK (((committed_amount + available_amount) <= total_budget_amount)),
    CONSTRAINT chk_product_budgets_total_positive CHECK ((total_budget_amount > (0)::numeric))
);


--
-- Name: COLUMN product_budgets.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_budgets.version IS 'Optimistic locking version - increment on every update';


--
-- Name: product_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_configs (
    id text NOT NULL,
    product_code text NOT NULL,
    product_name text NOT NULL,
    description text,
    config jsonb NOT NULL,
    status public."ProductStatus" DEFAULT 'ACTIVE'::public."ProductStatus" NOT NULL,
    active_from timestamp(3) without time zone NOT NULL,
    active_until timestamp(3) without time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: promptpay_qr_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promptpay_qr_codes (
    id text NOT NULL,
    loan_id text NOT NULL,
    payment_ref text NOT NULL,
    amount_expected numeric(15,2) NOT NULL,
    qr_code_data text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    status public."PromptPayQRStatus" DEFAULT 'ACTIVE'::public."PromptPayQRStatus" NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: registration_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_tokens (
    id text NOT NULL,
    line_user_id text NOT NULL,
    token text NOT NULL,
    user_id text,
    expires_at timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: security_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_alerts (
    id text NOT NULL,
    type text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    ip_address text NOT NULL,
    user_id text,
    endpoint text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    resolved_at timestamp(3) without time zone,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id text NOT NULL,
    user_id text,
    ip_address text NOT NULL,
    user_agent text,
    endpoint text NOT NULL,
    method text NOT NULL,
    threat_type text NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    payload text,
    blocked boolean DEFAULT false NOT NULL,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    refresh_token text,
    previous_token text,
    previous_token_expires_at timestamp(3) without time zone,
    previous_refresh_token text,
    ip_address text,
    user_agent text,
    is_valid boolean DEFAULT true NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: suspicious_transaction_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspicious_transaction_reports (
    id text NOT NULL,
    report_number character varying(50) NOT NULL,
    customer_id text,
    transaction_id text,
    suspicion_type character varying(100) NOT NULL,
    suspicion_details text NOT NULL,
    reported_by text NOT NULL,
    reported_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    review_status character varying(20) DEFAULT 'PENDING'::character varying,
    submitted_to character varying(100),
    submitted_at timestamp(3) without time zone,
    amlo_reference character varying(100),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    category text NOT NULL,
    description text,
    updated_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_assignments (
    id text NOT NULL,
    task_id text NOT NULL,
    task_type public."BankTaskType",
    assigned_to text NOT NULL,
    assigned_by text NOT NULL,
    priority character varying(20) DEFAULT 'MEDIUM'::character varying NOT NULL,
    due_date date NOT NULL,
    completion_date date,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone
);


--
-- Name: thai_banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thai_banks (
    id text NOT NULL,
    bank_code character varying(10) NOT NULL,
    bank_name character varying(100) NOT NULL,
    bank_name_th character varying(100) NOT NULL,
    bank_name_en character varying(100) NOT NULL,
    logo_url text,
    color_code character varying(10),
    is_active boolean DEFAULT true,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id text NOT NULL,
    user_id text NOT NULL,
    loan_id text,
    type public."TransactionType" NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'THB'::text NOT NULL,
    status public."TransactionStatus" DEFAULT 'PENDING'::public."TransactionStatus" NOT NULL,
    from_account text,
    to_account text,
    reference text,
    description text,
    metadata jsonb,
    processed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone_number text,
    avatar text,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    branch_id text,
    must_change_password boolean DEFAULT false NOT NULL,
    password_changed_at timestamp(3) without time zone,
    national_id text,
    line_user_id text,
    line_linked_at timestamp(3) without time zone,
    line_active boolean DEFAULT true NOT NULL,
    line_notifications_enabled boolean DEFAULT true NOT NULL,
    monthly_target numeric(15,2) DEFAULT 100000.00,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    last_login_at timestamp(3) without time zone
);


--
-- Name: year_interest_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.year_interest_tiers (
    id text NOT NULL,
    loan_product_id text NOT NULL,
    tier_type text NOT NULL,
    start_year integer NOT NULL,
    end_year text NOT NULL,
    rate numeric(5,4),
    formula text,
    min_rate numeric(5,4),
    max_rate numeric(5,4),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: aging_analysis aging_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis
    ADD CONSTRAINT aging_analysis_pkey PRIMARY KEY (id);


--
-- Name: aml_checks aml_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aml_checks
    ADD CONSTRAINT aml_checks_pkey PRIMARY KEY (id);


--
-- Name: approval_limits approval_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_limits
    ADD CONSTRAINT approval_limits_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: blocked_ips blocked_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_ip_address_key UNIQUE (ip_address);


--
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: budget_consumption budget_consumption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_consumption
    ADD CONSTRAINT budget_consumption_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: collection_workflow_steps collection_workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_workflow_steps
    ADD CONSTRAINT collection_workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: contact_logs contact_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_logs
    ADD CONSTRAINT contact_logs_pkey PRIMARY KEY (id);


--
-- Name: conversation_states conversation_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_states
    ADD CONSTRAINT conversation_states_pkey PRIMARY KEY (id);


--
-- Name: credit_line_drawdowns credit_line_drawdowns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_line_drawdowns
    ADD CONSTRAINT credit_line_drawdowns_pkey PRIMARY KEY (id);


--
-- Name: credit_lines credit_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_lines
    ADD CONSTRAINT credit_lines_pkey PRIMARY KEY (id);


--
-- Name: customer_active_products customer_active_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_active_products
    ADD CONSTRAINT customer_active_products_pkey PRIMARY KEY (id);


--
-- Name: customer_bank_statement_months customer_bank_statement_months_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_statement_months
    ADD CONSTRAINT customer_bank_statement_months_pkey PRIMARY KEY (id);


--
-- Name: customer_bank_statements customer_bank_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_statements
    ADD CONSTRAINT customer_bank_statements_pkey PRIMARY KEY (id);


--
-- Name: customer_business_histories customer_business_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_business_histories
    ADD CONSTRAINT customer_business_histories_pkey PRIMARY KEY (id);


--
-- Name: customer_comments customer_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_comments
    ADD CONSTRAINT customer_comments_pkey PRIMARY KEY (id);


--
-- Name: customer_credit_bureaus customer_credit_bureaus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_bureaus
    ADD CONSTRAINT customer_credit_bureaus_pkey PRIMARY KEY (id);


--
-- Name: customer_financial_statements customer_financial_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_financial_statements
    ADD CONSTRAINT customer_financial_statements_pkey PRIMARY KEY (id);


--
-- Name: customer_investments customer_investments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_investments
    ADD CONSTRAINT customer_investments_pkey PRIMARY KEY (id);


--
-- Name: customer_projections customer_projections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_projections
    ADD CONSTRAINT customer_projections_pkey PRIMARY KEY (id);


--
-- Name: customer_vat_records customer_vat_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_vat_records
    ADD CONSTRAINT customer_vat_records_pkey PRIMARY KEY (id);


--
-- Name: customer_working_capitals customer_working_capitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_working_capitals
    ADD CONSTRAINT customer_working_capitals_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: data_access_logs data_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_access_logs
    ADD CONSTRAINT data_access_logs_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: interest_rate_tiers interest_rate_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interest_rate_tiers
    ADD CONSTRAINT interest_rate_tiers_pkey PRIMARY KEY (id);


--
-- Name: invoice_access_logs invoice_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_access_logs
    ADD CONSTRAINT invoice_access_logs_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: loan_approval_workflow loan_approval_workflow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_approval_workflow
    ADD CONSTRAINT loan_approval_workflow_pkey PRIMARY KEY (id);


--
-- Name: loan_disbursements loan_disbursements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_pkey PRIMARY KEY (id);


--
-- Name: loan_interest_history loan_interest_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_interest_history
    ADD CONSTRAINT loan_interest_history_pkey PRIMARY KEY (id);


--
-- Name: loan_products loan_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_products
    ADD CONSTRAINT loan_products_pkey PRIMARY KEY (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: next_payment_invoices next_payment_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_payment_invoices
    ADD CONSTRAINT next_payment_invoices_pkey PRIMARY KEY (id);


--
-- Name: notification_actions notification_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_actions
    ADD CONSTRAINT notification_actions_pkey PRIMARY KEY (id);


--
-- Name: notification_audience_rules notification_audience_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_audience_rules
    ADD CONSTRAINT notification_audience_rules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_receipts payment_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_pkey PRIMARY KEY (id);


--
-- Name: payment_schedules payment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_pkey PRIMARY KEY (id);


--
-- Name: payment_timeline_events payment_timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_timeline_events
    ADD CONSTRAINT payment_timeline_events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: penalty_rules penalty_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penalty_rules
    ADD CONSTRAINT penalty_rules_pkey PRIMARY KEY (id);


--
-- Name: principal_prepayments principal_prepayments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.principal_prepayments
    ADD CONSTRAINT principal_prepayments_pkey PRIMARY KEY (id);


--
-- Name: privacy_consents privacy_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_pkey PRIMARY KEY (id);


--
-- Name: product_budgets product_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_budgets
    ADD CONSTRAINT product_budgets_pkey PRIMARY KEY (id);


--
-- Name: product_configs product_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_configs
    ADD CONSTRAINT product_configs_pkey PRIMARY KEY (id);


--
-- Name: promptpay_qr_codes promptpay_qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promptpay_qr_codes
    ADD CONSTRAINT promptpay_qr_codes_pkey PRIMARY KEY (id);


--
-- Name: registration_tokens registration_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT registration_tokens_pkey PRIMARY KEY (id);


--
-- Name: security_alerts security_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: suspicious_transaction_reports suspicious_transaction_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_transaction_reports
    ADD CONSTRAINT suspicious_transaction_reports_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: thai_banks thai_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thai_banks
    ADD CONSTRAINT thai_banks_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: year_interest_tiers year_interest_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.year_interest_tiers
    ADD CONSTRAINT year_interest_tiers_pkey PRIMARY KEY (id);


--
-- Name: Customer_businessName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_businessName_idx" ON public.customers USING btree (business_name);


--
-- Name: Disbursement_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Disbursement_status_idx" ON public.loan_disbursements USING btree (status);


--
-- Name: LoanProduct_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LoanProduct_status_idx" ON public.loan_products USING btree (status);


--
-- Name: Loan_branchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Loan_branchId_idx" ON public.loans USING btree (branch_id);


--
-- Name: Loan_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Loan_status_idx" ON public.loans USING btree (status);


--
-- Name: PaymentSchedule_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentSchedule_status_idx" ON public.payment_schedules USING btree (status);


--
-- Name: aging_analysis_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aging_analysis_branch_idx ON public.aging_analysis USING btree (branch_id);


--
-- Name: aging_analysis_bucket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aging_analysis_bucket_idx ON public.aging_analysis USING btree (aging_bucket);


--
-- Name: aging_analysis_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aging_analysis_customer_idx ON public.aging_analysis USING btree (customer_id);


--
-- Name: aging_analysis_loan_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX aging_analysis_loan_id_key ON public.aging_analysis USING btree (loan_id);


--
-- Name: aml_checks_check_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aml_checks_check_type_idx ON public.aml_checks USING btree (check_type);


--
-- Name: aml_checks_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aml_checks_customer_idx ON public.aml_checks USING btree (customer_id);


--
-- Name: approval_limits_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_limits_role_idx ON public.approval_limits USING btree (role);


--
-- Name: approval_limits_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_limits_status_idx ON public.approval_limits USING btree (status);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: blocked_ips_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blocked_ips_expires_at_idx ON public.blocked_ips USING btree (expires_at);


--
-- Name: blocked_ips_ip_address_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blocked_ips_ip_address_idx ON public.blocked_ips USING btree (ip_address);


--
-- Name: branches_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX branches_code_key ON public.branches USING btree (code);


--
-- Name: budget_consumption_branch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_consumption_branch_idx ON public.budget_consumption USING btree (branch_id);


--
-- Name: budget_consumption_budget_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_consumption_budget_idx ON public.budget_consumption USING btree (product_budget_id);


--
-- Name: budget_consumption_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_consumption_date_idx ON public.budget_consumption USING btree (consumption_date);


--
-- Name: budget_consumption_loan_consumption_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX budget_consumption_loan_consumption_type_key ON public.budget_consumption USING btree (loan_id, consumption_type);


--
-- Name: calendar_events_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_events_branch_id_idx ON public.calendar_events USING btree (branch_id);


--
-- Name: calendar_events_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_events_created_by_idx ON public.calendar_events USING btree (created_by);


--
-- Name: calendar_events_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_events_event_type_idx ON public.calendar_events USING btree (event_type);


--
-- Name: calendar_events_start_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendar_events_start_date_idx ON public.calendar_events USING btree (start_date);


--
-- Name: contact_logs_contact_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_logs_contact_date_idx ON public.contact_logs USING btree (contact_date);


--
-- Name: contact_logs_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_logs_customer_id_idx ON public.contact_logs USING btree (customer_id);


--
-- Name: contact_logs_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_logs_loan_id_idx ON public.contact_logs USING btree (loan_id);


--
-- Name: contact_logs_officer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_logs_officer_id_idx ON public.contact_logs USING btree (officer_id);


--
-- Name: contact_logs_task_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_logs_task_id_idx ON public.contact_logs USING btree (task_id);


--
-- Name: conversation_states_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversation_states_expires_at_idx ON public.conversation_states USING btree (expires_at);


--
-- Name: conversation_states_line_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX conversation_states_line_user_id_key ON public.conversation_states USING btree (line_user_id);


--
-- Name: credit_line_drawdowns_credit_line_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_line_drawdowns_credit_line_idx ON public.credit_line_drawdowns USING btree (credit_line_id);


--
-- Name: credit_line_drawdowns_drawdown_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX credit_line_drawdowns_drawdown_number_key ON public.credit_line_drawdowns USING btree (drawdown_number);


--
-- Name: credit_lines_credit_line_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX credit_lines_credit_line_number_key ON public.credit_lines USING btree (credit_line_number);


--
-- Name: credit_lines_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_lines_customer_idx ON public.credit_lines USING btree (customer_id);


--
-- Name: customer_active_products_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_active_products_customer_id_idx ON public.customer_active_products USING btree (customer_id);


--
-- Name: customer_active_products_customer_id_status_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_active_products_customer_id_status_key ON public.customer_active_products USING btree (customer_id, status);


--
-- Name: customer_active_products_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_active_products_loan_id_idx ON public.customer_active_products USING btree (loan_id);


--
-- Name: customer_bank_statement_months_statement_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_bank_statement_months_statement_id_idx ON public.customer_bank_statement_months USING btree (statement_id);


--
-- Name: customer_bank_statements_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_bank_statements_customer_id_idx ON public.customer_bank_statements USING btree (customer_id);


--
-- Name: customer_business_histories_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_business_histories_customer_id_idx ON public.customer_business_histories USING btree (customer_id);


--
-- Name: customer_comments_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_comments_customer_id_idx ON public.customer_comments USING btree (customer_id);


--
-- Name: customer_credit_bureaus_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_credit_bureaus_customer_id_idx ON public.customer_credit_bureaus USING btree (customer_id);


--
-- Name: customer_financial_statements_customer_id_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_financial_statements_customer_id_year_key ON public.customer_financial_statements USING btree (customer_id, year);


--
-- Name: customer_investments_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_investments_customer_id_idx ON public.customer_investments USING btree (customer_id);


--
-- Name: customer_projections_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_projections_customer_id_idx ON public.customer_projections USING btree (customer_id);


--
-- Name: customer_vat_records_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_vat_records_customer_id_idx ON public.customer_vat_records USING btree (customer_id);


--
-- Name: customer_vat_records_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_vat_records_year_idx ON public.customer_vat_records USING btree (year);


--
-- Name: customer_working_capitals_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_working_capitals_customer_id_idx ON public.customer_working_capitals USING btree (customer_id);


--
-- Name: customers_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_branch_id_idx ON public.customers USING btree (branch_id);


--
-- Name: customers_customer_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customers_customer_code_key ON public.customers USING btree (customer_code);


--
-- Name: customers_line_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customers_line_user_id_key ON public.customers USING btree (line_user_id);


--
-- Name: customers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_status_idx ON public.customers USING btree (status);


--
-- Name: customers_tax_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customers_tax_id_key ON public.customers USING btree (tax_id);


--
-- Name: customers_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customers_user_id_idx ON public.customers USING btree (user_id);


--
-- Name: data_access_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX data_access_logs_created_at_idx ON public.data_access_logs USING btree (created_at);


--
-- Name: data_access_logs_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX data_access_logs_customer_idx ON public.data_access_logs USING btree (customer_id);


--
-- Name: data_access_logs_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX data_access_logs_user_idx ON public.data_access_logs USING btree (user_id);


--
-- Name: documents_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_customer_id_idx ON public.documents USING btree (customer_id);


--
-- Name: documents_document_subtype_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_document_subtype_idx ON public.documents USING btree (document_subtype);


--
-- Name: documents_document_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_document_type_idx ON public.documents USING btree (document_type);


--
-- Name: documents_processing_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_processing_version_idx ON public.documents USING btree (processing_version);


--
-- Name: documents_review_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_review_status_idx ON public.documents USING btree (review_status);


--
-- Name: expenses_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_branch_id_idx ON public.expenses USING btree (branch_id);


--
-- Name: expenses_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_created_by_idx ON public.expenses USING btree (created_by);


--
-- Name: expenses_expense_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_expense_date_idx ON public.expenses USING btree (expense_date);


--
-- Name: expenses_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_status_idx ON public.expenses USING btree (status);


--
-- Name: idx_customers_branch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_branch_status ON public.customers USING btree (branch_id, status, created_at);


--
-- Name: idx_loans_id_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_id_version ON public.loans USING btree (id, version);


--
-- Name: idx_loans_status_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loans_status_dates ON public.loans USING btree (status, created_at, disbursement_date);


--
-- Name: idx_payment_schedules_id_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_schedules_id_version ON public.payment_schedules USING btree (id, version);


--
-- Name: idx_payments_id_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_id_version ON public.payments USING btree (id, version);


--
-- Name: idx_payments_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_idempotency_key ON public.payments USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_payments_loan_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_loan_date ON public.payments USING btree (loan_id, payment_date);


--
-- Name: idx_product_budgets_id_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_budgets_id_version ON public.product_budgets USING btree (id, version);


--
-- Name: interest_rate_tiers_effective_from_effective_until_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interest_rate_tiers_effective_from_effective_until_idx ON public.interest_rate_tiers USING btree (effective_from, effective_until);


--
-- Name: interest_rate_tiers_loan_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interest_rate_tiers_loan_product_id_idx ON public.interest_rate_tiers USING btree (loan_product_id);


--
-- Name: interest_rate_tiers_min_amount_max_amount_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interest_rate_tiers_min_amount_max_amount_idx ON public.interest_rate_tiers USING btree (min_amount, max_amount);


--
-- Name: interest_rate_tiers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX interest_rate_tiers_status_idx ON public.interest_rate_tiers USING btree (status);


--
-- Name: invoice_access_logs_attempted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_access_logs_attempted_at_idx ON public.invoice_access_logs USING btree (attempted_at);


--
-- Name: invoice_access_logs_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_access_logs_customer_id_idx ON public.invoice_access_logs USING btree (customer_id);


--
-- Name: invoice_access_logs_resource_id_attempted_at_success_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_access_logs_resource_id_attempted_at_success_idx ON public.invoice_access_logs USING btree (resource_id, attempted_at, success);


--
-- Name: invoice_access_logs_resource_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_access_logs_resource_id_idx ON public.invoice_access_logs USING btree (resource_id);


--
-- Name: invoice_access_logs_success_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_access_logs_success_idx ON public.invoice_access_logs USING btree (success);


--
-- Name: invoices_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_customer_id_idx ON public.invoices USING btree (customer_id);


--
-- Name: invoices_due_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_due_date_idx ON public.invoices USING btree (due_date);


--
-- Name: invoices_invoice_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices USING btree (invoice_number);


--
-- Name: invoices_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_loan_id_idx ON public.invoices USING btree (loan_id);


--
-- Name: invoices_payment_schedule_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_payment_schedule_id_idx ON public.invoices USING btree (payment_schedule_id);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: loan_approval_workflow_loan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_approval_workflow_loan_idx ON public.loan_approval_workflow USING btree (loan_id);


--
-- Name: loan_disbursements_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_disbursements_created_by_idx ON public.loan_disbursements USING btree (created_by);


--
-- Name: loan_disbursements_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_disbursements_loan_id_idx ON public.loan_disbursements USING btree (loan_id);


--
-- Name: loan_disbursements_requested_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_disbursements_requested_date_idx ON public.loan_disbursements USING btree (requested_date);


--
-- Name: loan_disbursements_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_disbursements_status_idx ON public.loan_disbursements USING btree (status);


--
-- Name: loan_interest_history_effective_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_interest_history_effective_date_idx ON public.loan_interest_history USING btree (effective_date);


--
-- Name: loan_interest_history_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_interest_history_loan_id_idx ON public.loan_interest_history USING btree (loan_id);


--
-- Name: loan_interest_history_payment_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_interest_history_payment_number_idx ON public.loan_interest_history USING btree (payment_number);


--
-- Name: loan_products_display_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_products_display_order_idx ON public.loan_products USING btree (display_order);


--
-- Name: loan_products_is_popular_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_products_is_popular_idx ON public.loan_products USING btree (is_popular);


--
-- Name: loan_products_product_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX loan_products_product_code_key ON public.loan_products USING btree (product_code);


--
-- Name: loan_products_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loan_products_status_idx ON public.loan_products USING btree (status);


--
-- Name: loans_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loans_branch_id_idx ON public.loans USING btree (branch_id);


--
-- Name: loans_contract_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX loans_contract_number_key ON public.loans USING btree (contract_number);


--
-- Name: loans_current_principal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loans_current_principal_idx ON public.loans USING btree (current_principal);


--
-- Name: loans_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loans_customer_id_idx ON public.loans USING btree (customer_id);


--
-- Name: loans_loan_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loans_loan_product_id_idx ON public.loans USING btree (loan_product_id);


--
-- Name: loans_officer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loans_officer_id_idx ON public.loans USING btree (officer_id);


--
-- Name: loans_product_config_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loans_product_config_id_idx ON public.loans USING btree (product_config_id);


--
-- Name: loans_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loans_status_idx ON public.loans USING btree (status);


--
-- Name: next_payment_invoices_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX next_payment_invoices_created_at_idx ON public.next_payment_invoices USING btree (created_at);


--
-- Name: next_payment_invoices_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX next_payment_invoices_customer_id_idx ON public.next_payment_invoices USING btree (customer_id);


--
-- Name: next_payment_invoices_invoice_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX next_payment_invoices_invoice_number_key ON public.next_payment_invoices USING btree (invoice_number);


--
-- Name: next_payment_invoices_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX next_payment_invoices_loan_id_idx ON public.next_payment_invoices USING btree (loan_id);


--
-- Name: next_payment_invoices_payment_schedule_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX next_payment_invoices_payment_schedule_id_idx ON public.next_payment_invoices USING btree (payment_schedule_id);


--
-- Name: next_payment_invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX next_payment_invoices_status_idx ON public.next_payment_invoices USING btree (status);


--
-- Name: notification_actions_notification_type_action_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_actions_notification_type_action_id_key ON public.notification_actions USING btree (notification_type, action_id);


--
-- Name: notification_audience_rules_notification_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_audience_rules_notification_type_key ON public.notification_audience_rules USING btree (notification_type);


--
-- Name: notifications_archived_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_archived_idx ON public.notifications USING btree (archived);


--
-- Name: notifications_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);


--
-- Name: notifications_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_event_id_idx ON public.notifications USING btree (event_id);


--
-- Name: notifications_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_priority_idx ON public.notifications USING btree (priority);


--
-- Name: notifications_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_read_idx ON public.notifications USING btree (read);


--
-- Name: notifications_user_id_archived_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_archived_created_at_idx ON public.notifications USING btree (user_id, archived, created_at DESC);


--
-- Name: notifications_user_id_dedup_key_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_dedup_key_created_at_idx ON public.notifications USING btree (user_id, dedup_key, created_at DESC);


--
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);


--
-- Name: notifications_user_id_read_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_read_created_at_idx ON public.notifications USING btree (user_id, read, created_at DESC);


--
-- Name: payment_receipts_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_receipts_customer_id_idx ON public.payment_receipts USING btree (customer_id);


--
-- Name: payment_receipts_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_receipts_loan_id_idx ON public.payment_receipts USING btree (loan_id);


--
-- Name: payment_receipts_payment_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_receipts_payment_date_idx ON public.payment_receipts USING btree (payment_date);


--
-- Name: payment_receipts_payment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_receipts_payment_id_idx ON public.payment_receipts USING btree (payment_id);


--
-- Name: payment_receipts_receipt_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_receipts_receipt_number_idx ON public.payment_receipts USING btree (receipt_number);


--
-- Name: payment_receipts_receipt_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payment_receipts_receipt_number_key ON public.payment_receipts USING btree (receipt_number);


--
-- Name: payment_schedules_days_overdue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_schedules_days_overdue_idx ON public.payment_schedules USING btree (days_overdue);


--
-- Name: payment_schedules_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_schedules_loan_id_idx ON public.payment_schedules USING btree (loan_id);


--
-- Name: payment_schedules_payment_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_schedules_payment_date_idx ON public.payment_schedules USING btree (payment_date);


--
-- Name: payment_schedules_statement_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_schedules_statement_number_idx ON public.payment_schedules USING btree (statement_number);


--
-- Name: payment_schedules_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_schedules_status_idx ON public.payment_schedules USING btree (status);


--
-- Name: payment_timeline_events_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_timeline_events_event_type_idx ON public.payment_timeline_events USING btree (event_type);


--
-- Name: payment_timeline_events_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_timeline_events_loan_id_idx ON public.payment_timeline_events USING btree (loan_id);


--
-- Name: payment_timeline_events_payment_schedule_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_timeline_events_payment_schedule_id_idx ON public.payment_timeline_events USING btree (payment_schedule_id);


--
-- Name: payment_timeline_events_scheduled_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_timeline_events_scheduled_date_idx ON public.payment_timeline_events USING btree (scheduled_date);


--
-- Name: payment_timeline_events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_timeline_events_status_idx ON public.payment_timeline_events USING btree (status);


--
-- Name: payment_timeline_events_status_scheduled_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_timeline_events_status_scheduled_date_idx ON public.payment_timeline_events USING btree (status, scheduled_date);


--
-- Name: payments_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_loan_id_idx ON public.payments USING btree (loan_id);


--
-- Name: payments_payment_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_payment_date_idx ON public.payments USING btree (payment_date);


--
-- Name: payments_payment_schedule_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_payment_schedule_id_idx ON public.payments USING btree (payment_schedule_id);


--
-- Name: payments_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_reference_key ON public.payments USING btree (reference);


--
-- Name: penalty_rules_loan_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX penalty_rules_loan_product_id_idx ON public.penalty_rules USING btree (loan_product_id);


--
-- Name: penalty_rules_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX penalty_rules_status_idx ON public.penalty_rules USING btree (status);


--
-- Name: principal_prepayments_loan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX principal_prepayments_loan_idx ON public.principal_prepayments USING btree (loan_id);


--
-- Name: privacy_consents_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX privacy_consents_customer_idx ON public.privacy_consents USING btree (customer_id);


--
-- Name: product_budgets_available_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_budgets_available_idx ON public.product_budgets USING btree (available_amount);


--
-- Name: product_budgets_product_fiscal_year_quarter_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_budgets_product_fiscal_year_quarter_key ON public.product_budgets USING btree (product_id, fiscal_year, quarter);


--
-- Name: product_budgets_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_budgets_product_idx ON public.product_budgets USING btree (product_id, fiscal_year);


--
-- Name: product_budgets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_budgets_status_idx ON public.product_budgets USING btree (budget_status);


--
-- Name: product_configs_product_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_configs_product_code_key ON public.product_configs USING btree (product_code);


--
-- Name: product_configs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_configs_status_idx ON public.product_configs USING btree (status);


--
-- Name: promptpay_qr_codes_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promptpay_qr_codes_expires_at_idx ON public.promptpay_qr_codes USING btree (expires_at);


--
-- Name: promptpay_qr_codes_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promptpay_qr_codes_loan_id_idx ON public.promptpay_qr_codes USING btree (loan_id);


--
-- Name: promptpay_qr_codes_payment_ref_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX promptpay_qr_codes_payment_ref_key ON public.promptpay_qr_codes USING btree (payment_ref);


--
-- Name: promptpay_qr_codes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promptpay_qr_codes_status_idx ON public.promptpay_qr_codes USING btree (status);


--
-- Name: registration_tokens_line_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registration_tokens_line_user_id_idx ON public.registration_tokens USING btree (line_user_id);


--
-- Name: registration_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX registration_tokens_token_key ON public.registration_tokens USING btree (token);


--
-- Name: security_alerts_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_alerts_created_at_idx ON public.security_alerts USING btree (created_at);


--
-- Name: security_alerts_ip_address_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_alerts_ip_address_idx ON public.security_alerts USING btree (ip_address);


--
-- Name: security_alerts_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_alerts_severity_idx ON public.security_alerts USING btree (severity);


--
-- Name: security_alerts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_alerts_status_idx ON public.security_alerts USING btree (status);


--
-- Name: security_alerts_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_alerts_type_idx ON public.security_alerts USING btree (type);


--
-- Name: security_alerts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_alerts_user_id_idx ON public.security_alerts USING btree (user_id);


--
-- Name: security_events_blocked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_events_blocked_idx ON public.security_events USING btree (blocked);


--
-- Name: security_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_events_created_at_idx ON public.security_events USING btree (created_at);


--
-- Name: security_events_ip_address_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_events_ip_address_idx ON public.security_events USING btree (ip_address);


--
-- Name: security_events_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_events_severity_idx ON public.security_events USING btree (severity);


--
-- Name: security_events_threat_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_events_threat_type_idx ON public.security_events USING btree (threat_type);


--
-- Name: security_events_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_events_user_id_idx ON public.security_events USING btree (user_id);


--
-- Name: sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_expires_at_idx ON public.sessions USING btree (expires_at);


--
-- Name: sessions_previous_token_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_previous_token_expires_at_idx ON public.sessions USING btree (previous_token_expires_at);


--
-- Name: sessions_previous_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_previous_token_idx ON public.sessions USING btree (previous_token);


--
-- Name: sessions_refresh_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sessions_refresh_token_key ON public.sessions USING btree (refresh_token);


--
-- Name: sessions_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: suspicious_transaction_reports_report_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX suspicious_transaction_reports_report_number_key ON public.suspicious_transaction_reports USING btree (report_number);


--
-- Name: system_configs_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_configs_category_idx ON public.system_configs USING btree (category);


--
-- Name: system_configs_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX system_configs_key_key ON public.system_configs USING btree (key);


--
-- Name: system_configs_updated_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_configs_updated_by_idx ON public.system_configs USING btree (updated_by);


--
-- Name: task_assignments_assigned_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_assigned_to_idx ON public.task_assignments USING btree (assigned_to);


--
-- Name: task_assignments_due_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_due_date_idx ON public.task_assignments USING btree (due_date);


--
-- Name: task_assignments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_assignments_status_idx ON public.task_assignments USING btree (status);


--
-- Name: thai_banks_bank_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX thai_banks_bank_code_key ON public.thai_banks USING btree (bank_code);


--
-- Name: transactions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_created_at_idx ON public.transactions USING btree (created_at);


--
-- Name: transactions_loan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_loan_id_idx ON public.transactions USING btree (loan_id);


--
-- Name: transactions_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX transactions_reference_key ON public.transactions USING btree (reference);


--
-- Name: transactions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_status_idx ON public.transactions USING btree (status);


--
-- Name: transactions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transactions_user_id_idx ON public.transactions USING btree (user_id);


--
-- Name: users_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_branch_id_idx ON public.users USING btree (branch_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_line_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_line_user_id_key ON public.users USING btree (line_user_id);


--
-- Name: year_interest_tiers_loan_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX year_interest_tiers_loan_product_id_idx ON public.year_interest_tiers USING btree (loan_product_id);


--
-- Name: year_interest_tiers_start_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX year_interest_tiers_start_year_idx ON public.year_interest_tiers USING btree (start_year);


--
-- Name: aging_analysis aging_analysis_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis
    ADD CONSTRAINT aging_analysis_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: aging_analysis aging_analysis_collection_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis
    ADD CONSTRAINT aging_analysis_collection_agent_id_fkey FOREIGN KEY (collection_agent_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: aging_analysis aging_analysis_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis
    ADD CONSTRAINT aging_analysis_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: aging_analysis aging_analysis_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis
    ADD CONSTRAINT aging_analysis_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: aml_checks aml_checks_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aml_checks
    ADD CONSTRAINT aml_checks_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: aml_checks aml_checks_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aml_checks
    ADD CONSTRAINT aml_checks_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: aml_checks aml_checks_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aml_checks
    ADD CONSTRAINT aml_checks_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: budget_consumption budget_consumption_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_consumption
    ADD CONSTRAINT budget_consumption_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: budget_consumption budget_consumption_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_consumption
    ADD CONSTRAINT budget_consumption_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: budget_consumption budget_consumption_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_consumption
    ADD CONSTRAINT budget_consumption_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: budget_consumption budget_consumption_product_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_consumption
    ADD CONSTRAINT budget_consumption_product_budget_id_fkey FOREIGN KEY (product_budget_id) REFERENCES public.product_budgets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: budget_consumption budget_consumption_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_consumption
    ADD CONSTRAINT budget_consumption_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: calendar_events calendar_events_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: collection_workflow_steps collection_workflow_steps_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_workflow_steps
    ADD CONSTRAINT collection_workflow_steps_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contact_logs contact_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_logs
    ADD CONSTRAINT contact_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contact_logs contact_logs_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_logs
    ADD CONSTRAINT contact_logs_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contact_logs contact_logs_officer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_logs
    ADD CONSTRAINT contact_logs_officer_id_fkey FOREIGN KEY (officer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: credit_line_drawdowns credit_line_drawdowns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_line_drawdowns
    ADD CONSTRAINT credit_line_drawdowns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: credit_line_drawdowns credit_line_drawdowns_credit_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_line_drawdowns
    ADD CONSTRAINT credit_line_drawdowns_credit_line_id_fkey FOREIGN KEY (credit_line_id) REFERENCES public.credit_lines(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: credit_lines credit_lines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_lines
    ADD CONSTRAINT credit_lines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: credit_lines credit_lines_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_lines
    ADD CONSTRAINT credit_lines_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_active_products customer_active_products_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_active_products
    ADD CONSTRAINT customer_active_products_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_active_products customer_active_products_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_active_products
    ADD CONSTRAINT customer_active_products_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_active_products customer_active_products_loan_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_active_products
    ADD CONSTRAINT customer_active_products_loan_product_id_fkey FOREIGN KEY (loan_product_id) REFERENCES public.loan_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_bank_statement_months customer_bank_statement_months_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_statement_months
    ADD CONSTRAINT customer_bank_statement_months_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.customer_bank_statements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_bank_statements customer_bank_statements_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_statements
    ADD CONSTRAINT customer_bank_statements_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_business_histories customer_business_histories_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_business_histories
    ADD CONSTRAINT customer_business_histories_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_comments customer_comments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_comments
    ADD CONSTRAINT customer_comments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_credit_bureaus customer_credit_bureaus_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_bureaus
    ADD CONSTRAINT customer_credit_bureaus_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_financial_statements customer_financial_statements_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_financial_statements
    ADD CONSTRAINT customer_financial_statements_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_investments customer_investments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_investments
    ADD CONSTRAINT customer_investments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_projections customer_projections_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_projections
    ADD CONSTRAINT customer_projections_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_vat_records customer_vat_records_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_vat_records
    ADD CONSTRAINT customer_vat_records_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_working_capitals customer_working_capitals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_working_capitals
    ADD CONSTRAINT customer_working_capitals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customers customers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: customers customers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: data_access_logs data_access_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_access_logs
    ADD CONSTRAINT data_access_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: data_access_logs data_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_access_logs
    ADD CONSTRAINT data_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_reimbursed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_reimbursed_by_fkey FOREIGN KEY (reimbursed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: interest_rate_tiers interest_rate_tiers_loan_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interest_rate_tiers
    ADD CONSTRAINT interest_rate_tiers_loan_product_id_fkey FOREIGN KEY (loan_product_id) REFERENCES public.loan_products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice_access_logs invoice_access_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_access_logs
    ADD CONSTRAINT invoice_access_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_payment_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_payment_schedule_id_fkey FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: loan_approval_workflow loan_approval_workflow_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_approval_workflow
    ADD CONSTRAINT loan_approval_workflow_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loan_approval_workflow loan_approval_workflow_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_approval_workflow
    ADD CONSTRAINT loan_approval_workflow_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: loan_disbursements loan_disbursements_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loan_disbursements loan_disbursements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: loan_disbursements loan_disbursements_disbursed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_disbursed_by_fkey FOREIGN KEY (disbursed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loan_disbursements loan_disbursements_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: loan_disbursements loan_disbursements_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_disbursements
    ADD CONSTRAINT loan_disbursements_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loan_interest_history loan_interest_history_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loan_interest_history
    ADD CONSTRAINT loan_interest_history_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: loans loans_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loans loans_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: loans loans_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: loans loans_loan_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_loan_product_id_fkey FOREIGN KEY (loan_product_id) REFERENCES public.loan_products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loans loans_officer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_officer_id_fkey FOREIGN KEY (officer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: next_payment_invoices next_payment_invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_payment_invoices
    ADD CONSTRAINT next_payment_invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: next_payment_invoices next_payment_invoices_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_payment_invoices
    ADD CONSTRAINT next_payment_invoices_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: next_payment_invoices next_payment_invoices_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_payment_invoices
    ADD CONSTRAINT next_payment_invoices_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: next_payment_invoices next_payment_invoices_payment_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_payment_invoices
    ADD CONSTRAINT next_payment_invoices_payment_schedule_id_fkey FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: next_payment_invoices next_payment_invoices_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_payment_invoices
    ADD CONSTRAINT next_payment_invoices_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_receipts payment_receipts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_receipts payment_receipts_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.next_payment_invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_receipts payment_receipts_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_receipts payment_receipts_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_receipts payment_receipts_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_schedules payment_schedules_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment_timeline_events payment_timeline_events_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_timeline_events
    ADD CONSTRAINT payment_timeline_events_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_timeline_events payment_timeline_events_payment_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_timeline_events
    ADD CONSTRAINT payment_timeline_events_payment_schedule_id_fkey FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_payment_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_schedule_id_fkey FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: penalty_rules penalty_rules_loan_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penalty_rules
    ADD CONSTRAINT penalty_rules_loan_product_id_fkey FOREIGN KEY (loan_product_id) REFERENCES public.loan_products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: principal_prepayments principal_prepayments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.principal_prepayments
    ADD CONSTRAINT principal_prepayments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: principal_prepayments principal_prepayments_payment_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.principal_prepayments
    ADD CONSTRAINT principal_prepayments_payment_schedule_id_fkey FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: principal_prepayments principal_prepayments_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.principal_prepayments
    ADD CONSTRAINT principal_prepayments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: privacy_consents privacy_consents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_consents
    ADD CONSTRAINT privacy_consents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_budgets product_budgets_budget_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_budgets
    ADD CONSTRAINT product_budgets_budget_owner_fkey FOREIGN KEY (budget_owner) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_budgets product_budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_budgets
    ADD CONSTRAINT product_budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_budgets product_budgets_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_budgets
    ADD CONSTRAINT product_budgets_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.loan_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: security_alerts security_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_alerts
    ADD CONSTRAINT security_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: suspicious_transaction_reports suspicious_transaction_reports_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_transaction_reports
    ADD CONSTRAINT suspicious_transaction_reports_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: suspicious_transaction_reports suspicious_transaction_reports_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_transaction_reports
    ADD CONSTRAINT suspicious_transaction_reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: suspicious_transaction_reports suspicious_transaction_reports_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspicious_transaction_reports
    ADD CONSTRAINT suspicious_transaction_reports_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: system_configs system_configs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: task_assignments task_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: task_assignments task_assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transactions transactions_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: year_interest_tiers year_interest_tiers_loan_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.year_interest_tiers
    ADD CONSTRAINT year_interest_tiers_loan_product_id_fkey FOREIGN KEY (loan_product_id) REFERENCES public.loan_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 1q2O0NVnNWzhXshHmPgMO4rS6QcfmeRaA2J5ax68fNBTDTs9W3PM82qDRwUFacj

