-- ============================================================================
-- SME Bank 2026 - Enterprise-Grade Database Schema
-- Version: 2.0.0 (Complete Redesign)
-- Designed by: Lead Systems Architect
-- Standards: BOT Compliant, 3NF Normalized, Banking-Grade Security
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- DOMAIN TYPES (Custom Data Types for Banking)
-- ============================================================================

-- Monetary amounts with 4 decimal places for precise calculations
CREATE DOMAIN monetary_amount AS DECIMAL(19,4)
    CHECK (VALUE >= 0);

-- Interest rates (0-100%)
CREATE DOMAIN interest_rate AS DECIMAL(5,4)
    CHECK (VALUE >= 0 AND VALUE <= 100);

-- Percentages (0-100%)
CREATE DOMAIN percentage AS DECIMAL(5,2)
    CHECK (VALUE >= 0 AND VALUE <= 100);

-- Thai Tax ID (13 digits)
CREATE DOMAIN tax_id_type AS TEXT
    CHECK (VALUE ~ '^\d{13}$');

-- Thai National ID (13 digits)
CREATE DOMAIN national_id_type AS TEXT
    CHECK (VALUE ~ '^\d{13}$');

-- Thai Phone Number (10 digits starting with 0)
CREATE DOMAIN phone_number_type AS TEXT
    CHECK (VALUE ~ '^0\d{9}$');

-- Encrypted data type
CREATE DOMAIN encrypted_text AS BYTEA;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Organization Status
CREATE TYPE organization_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED');

-- User Roles
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OFFICER', 'CLERK', 'AUDITOR', 'VIEWER');

-- User Status
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_ACTIVATION');

-- Customer Status
CREATE TYPE customer_status AS ENUM ('PROSPECT', 'ACTIVE', 'DORMANT', 'SUSPENDED', 'BLACKLISTED', 'CLOSED');

-- Business Registration Type
CREATE TYPE business_registration_type AS ENUM ('SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LIMITED_COMPANY', 'PUBLIC_COMPANY', 'OTHER');

-- Business Size
CREATE TYPE business_size AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE');

-- Loan Status
CREATE TYPE loan_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'ACTIVE', 'PAID_OFF', 'DEFAULTED', 'NPL', 'RESTRUCTURED', 'CLOSED');

-- Loan Type
CREATE TYPE loan_type AS ENUM ('WORKING_CAPITAL', 'FIXED_ASSET', 'INVESTMENT', 'TRADE_FINANCE', 'OVERDRAFT', 'REVOLVING_CREDIT', 'TERM_LOAN', 'BRIDGE_LOAN');

-- Interest Rate Type
CREATE TYPE interest_rate_type AS ENUM ('FIXED', 'VARIABLE', 'FLOATING', 'HYBRID');

-- Payment Status
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED', 'PARTIALLY_APPLIED');

-- Payment Method
CREATE TYPE payment_method AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'PROMPTPAY', 'DIRECT_DEBIT', 'WIRE_TRANSFER', 'OTHER');

-- Transaction Type
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'LOAN_DISBURSEMENT', 'LOAN_PAYMENT', 'FEE', 'INTEREST', 'PENALTY', 'REFUND', 'ADJUSTMENT');

-- Transaction Status
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED', 'ON_HOLD');

-- Document Status
CREATE TYPE document_status AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- Document Category
CREATE TYPE document_category AS ENUM ('IDENTITY', 'BUSINESS_REGISTRATION', 'FINANCIAL_STATEMENT', 'TAX_DOCUMENT', 'BANK_STATEMENT', 'COLLATERAL', 'CONTRACT', 'OTHER');

-- Disbursement Status
CREATE TYPE disbursement_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISBURSED', 'CANCELLED', 'ON_HOLD');

-- Contact Method
CREATE TYPE contact_method AS ENUM ('PHONE', 'EMAIL', 'LINE', 'VISIT', 'LETTER', 'OTHER');

-- Contact Outcome
CREATE TYPE contact_outcome AS ENUM ('SUCCESSFUL', 'PROMISED_TO_PAY', 'REQUEST_EXTENSION', 'UNREACHABLE', 'REFUSED', 'CALL_BACK', 'OTHER');

-- Notification Priority
CREATE TYPE notification_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- Notification Status
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- Audit Action Types
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'APPROVE', 'REJECT', 'DISBURSE', 'COLLECT', 'OTHER');

-- ============================================================================
-- CORE TABLES (3NF Normalized)
-- ============================================================================

-- Table: organizations (Branches, HQ, etc.)
-- Purpose: Physical locations and organizational units
CREATE TABLE organizations (
    organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_code VARCHAR(20) NOT NULL UNIQUE,
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(50) NOT NULL DEFAULT 'BRANCH', -- HQ, BRANCH, REGIONAL_OFFICE
    parent_organization_id UUID REFERENCES organizations(organization_id),
    
    -- Contact Information
    address TEXT,
    district VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'THAILAND',
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Geographic Data
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Operational Data
    status organization_status NOT NULL DEFAULT 'ACTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT chk_organization_code_format CHECK (organization_code ~ '^[A-Z0-9-]+$'),
    CONSTRAINT chk_organization_hierarchy CHECK (
        organization_id != parent_organization_id OR parent_organization_id IS NULL
    )
);

-- Indexes
CREATE INDEX idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_type ON organizations(organization_type);

-- Table: users
-- Purpose: System users and their authentication/authorization
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Personal Information (Encrypted)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    national_id national_id_type, -- Encrypted at application level
    
    -- Authentication
    password_hash TEXT NOT NULL,
    password_changed_at TIMESTAMPTZ,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Authorization
    role user_role NOT NULL DEFAULT 'VIEWER',
    status user_status NOT NULL DEFAULT 'PENDING_ACTIVATION',
    
    -- Organizational Assignment
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    
    -- LINE Integration
    line_user_id VARCHAR(255) UNIQUE,
    line_linked_at TIMESTAMPTZ,
    line_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Performance Tracking
    monthly_target monetary_amount,
    current_achievement monetary_amount DEFAULT 0,
    
    -- Session Management
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Soft Delete
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT chk_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_phone_format CHECK (phone_number IS NULL OR phone_number ~ '^0\d{9}$'),
    CONSTRAINT chk_monthly_target_positive CHECK (monthly_target IS NULL OR monthly_target > 0)
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_line ON users(line_user_id);

-- Table: customers
-- Purpose: SME customer entities
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(20) NOT NULL UNIQUE,
    
    -- Business Information
    business_name VARCHAR(255) NOT NULL,
    business_name_th VARCHAR(255),
    business_type VARCHAR(100),
    business_registration_type business_registration_type,
    business_registration_date DATE,
    registered_capital monetary_amount,
    
    -- Business Classification
    business_size business_size,
    industry_code VARCHAR(10),
    number_of_employees INTEGER,
    business_age_years INTEGER,
    
    -- Contact Information
    phone phone_number_type NOT NULL,
    mobile_phone phone_number_type,
    email VARCHAR(255),
    address TEXT,
    district VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Tax and Legal Information (Encrypted)
    tax_id tax_id_type NOT NULL,
    representative_national_id national_id_type,
    
    -- Financial Information
    annual_revenue monetary_amount,
    net_income monetary_amount,
    total_assets monetary_amount,
    total_liabilities monetary_amount,
    equity monetary_amount,
    debt_to_equity_ratio DECIMAL(5,2),
    
    -- Credit Information
    credit_score INTEGER CHECK (credit_score BETWEEN 0 AND 1000),
    credit_rating VARCHAR(10),
    
    -- LINE Integration
    line_user_id VARCHAR(255) UNIQUE,
    line_linked_at TIMESTAMPTZ,
    
    -- Status and Classification
    status customer_status NOT NULL DEFAULT 'PROSPECT',
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Organizational Assignment
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    assigned_officer_id UUID REFERENCES users(user_id),
    
    -- Document Completeness
    documents_complete BOOLEAN NOT NULL DEFAULT FALSE,
    credit_approved BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Soft Delete
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT chk_customer_code_format CHECK (customer_code ~ '^[A-Z0-9-]+$'),
    CONSTRAINT chk_registered_capital_positive CHECK (registered_capital IS NULL OR registered_capital > 0),
    CONSTRAINT chk_annual_revenue_positive CHECK (annual_revenue IS NULL OR annual_revenue > 0)
);

-- Indexes
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_organization ON customers(organization_id);
CREATE INDEX idx_customers_officer ON customers(assigned_officer_id);
CREATE INDEX idx_customers_tax_id ON customers(tax_id);
CREATE INDEX idx_customers_line ON customers(line_user_id);
CREATE INDEX idx_customers_risk ON customers(risk_level);

-- Table: loan_products
-- Purpose: Loan product definitions and configurations
CREATE TABLE loan_products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(20) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    product_name_th VARCHAR(255),
    product_description TEXT,
    
    -- Product Type and Purpose
    loan_type loan_type NOT NULL,
    purpose TEXT[],
    target_market TEXT[],
    
    -- Eligibility Criteria
    min_business_age_years INTEGER DEFAULT 0,
    min_annual_revenue monetary_amount,
    max_annual_revenue monetary_amount,
    min_credit_score INTEGER,
    required_documents TEXT[],
    
    -- Loan Parameters
    min_loan_amount monetary_amount NOT NULL,
    max_loan_amount monetary_amount NOT NULL,
    min_term_months INTEGER NOT NULL,
    max_term_months INTEGER NOT NULL,
    
    -- Interest Configuration
    interest_rate_type interest_rate_type NOT NULL,
    base_interest_rate interest_rate NOT NULL,
    min_interest_rate interest_rate,
    max_interest_rate interest_rate,
    interest_rate_formula TEXT,
    
    -- Grace Period and Terms
    grace_period_months INTEGER DEFAULT 0,
    payment_frequency VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL
    payment_day_of_month INTEGER CHECK (payment_day_of_month BETWEEN 1 AND 31),
    payment_day_adjustment VARCHAR(20) DEFAULT 'LAST_DAY', -- LAST_DAY, FIRST_DAY, SPECIFIC_DAY
    
    -- Fees and Charges
    processing_fee_rate percentage,
    processing_fee_min_amount monetary_amount,
    late_payment_fee_rate percentage,
    early_repayment_fee_rate percentage,
    
    -- Collateral Requirements
    collateral_required BOOLEAN NOT NULL DEFAULT TRUE,
    collateral_types TEXT[],
    collateral_value_percentage DECIMAL(5,2),
    
    -- Government Subsidy
    government_subsidy BOOLEAN NOT NULL DEFAULT FALSE,
    subsidy_details TEXT,
    
    -- Product Status
    status organization_status NOT NULL DEFAULT 'ACTIVE',
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    -- Validity Period
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_loan_products_code ON loan_products(product_code);
CREATE INDEX idx_loan_products_status ON loan_products(status);
CREATE INDEX idx_loan_products_type ON loan_products(loan_type);
CREATE INDEX idx_loan_products_effective ON loan_products(effective_from, effective_until);

-- Table: interest_rate_tiers
-- Purpose: Tiered interest rates based on loan amount or duration
CREATE TABLE interest_rate_tiers (
    tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES loan_products(product_id),
    
    -- Tier Definition
    tier_name VARCHAR(100) NOT NULL,
    tier_order INTEGER NOT NULL,
    
    -- Amount Range
    min_amount monetary_amount NOT NULL,
    max_amount monetary_amount,
    
    -- Duration Range (years)
    min_duration_years INTEGER,
    max_duration_years INTEGER,
    
    -- Interest Rate
    interest_rate interest_rate NOT NULL,
    
    -- Validity Period
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMPTZ,
    
    -- Status
    status organization_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT chk_tier_amount_range CHECK (min_amount < max_amount OR max_amount IS NULL),
    CONSTRAINT chk_tier_duration_range CHECK (min_duration_years < max_duration_years OR max_duration_years IS NULL)
);

-- Indexes
CREATE INDEX idx_interest_tiers_product ON interest_rate_tiers(product_id);
CREATE INDEX idx_interest_tiers_amount ON interest_rate_tiers(min_amount, max_amount);
CREATE INDEX idx_interest_tiers_duration ON interest_rate_tiers(min_duration_years, max_duration_years);
CREATE INDEX idx_interest_tiers_effective ON interest_rate_tiers(effective_from, effective_until);

-- Table: loans
-- Purpose: Loan contracts and agreements
CREATE TABLE loans (
    loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Customer Reference
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    officer_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Product Reference
    product_id UUID REFERENCES loan_products(product_id),
    
    -- Loan Amount and Terms
    principal_amount monetary_amount NOT NULL,
    approved_amount monetary_amount,
    disbursed_amount monetary_amount NOT NULL DEFAULT 0,
    outstanding_balance monetary_amount NOT NULL DEFAULT 0,
    
    -- Interest Configuration
    interest_rate interest_rate NOT NULL,
    interest_rate_type interest_rate_type NOT NULL,
    interest_calculation_method VARCHAR(50) DEFAULT 'REDUCING_BALANCE', -- REDUCING_BALANCE, FLAT_RATE, COMPOUND
    accumulated_interest monetary_amount NOT NULL DEFAULT 0,
    
    -- Loan Terms
    term_months INTEGER NOT NULL,
    payment_frequency VARCHAR(20) DEFAULT 'MONTHLY',
    payment_day INTEGER NOT NULL DEFAULT 1,
    payment_day_adjustment VARCHAR(20) DEFAULT 'LAST_DAY',
    grace_period_months INTEGER NOT NULL DEFAULT 0,
    
    -- Repayment Schedule
    monthly_installment monetary_amount,
    total_interest_amount monetary_amount,
    total_repayment_amount monetary_amount,
    
    -- Key Dates
    application_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMPTZ,
    disbursement_date TIMESTAMPTZ,
    first_payment_date TIMESTAMPTZ,
    maturity_date TIMESTAMPTZ,
    last_payment_date TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    next_payment_amount monetary_amount,
    
    -- Early Repayment
    allow_early_repayment BOOLEAN NOT NULL DEFAULT TRUE,
    early_repayment_penalty_rate interest_rate DEFAULT 0,
    
    -- Status and Workflow
    status loan_status NOT NULL DEFAULT 'DRAFT',
    approval_level VARCHAR(50),
    current_approval_level VARCHAR(50),
    
    -- Risk Assessment
    dscr DECIMAL(5,2), -- Debt Service Coverage Ratio
    dscr_status VARCHAR(20),
    risk_level VARCHAR(20),
    
    -- Overdue Tracking
    overdue_days INTEGER NOT NULL DEFAULT 0,
    overdue_amount monetary_amount NOT NULL DEFAULT 0,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Soft Delete
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT chk_loan_number_format CHECK (loan_number ~ '^[A-Z0-9-]+$'),
    CONSTRAINT chk_principal_positive CHECK (principal_amount > 0),
    CONSTRAINT chk_interest_rate_valid CHECK (interest_rate >= 0 AND interest_rate <= 100),
    CONSTRAINT chk_term_months_valid CHECK (term_months > 0 AND term_months <= 360),
    CONSTRAINT chk_payment_day_valid CHECK (payment_day >= 1 AND payment_day <= 31),
    CONSTRAINT chk_outstanding_balance_non_negative CHECK (outstanding_balance >= 0),
    CONSTRAINT chk_dscr_positive CHECK (dscr IS NULL OR dscr >= 0)
);

-- Indexes
CREATE INDEX idx_loans_number ON loans(loan_number);
CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_organization ON loans(organization_id);
CREATE INDEX idx_loans_officer ON loans(officer_id);
CREATE INDEX idx_loans_status ON loans(status);
-- DRE Recommendation: Removed idx_loans_product (low query frequency, write amplification)
-- DRE Recommendation: Removed idx_loans_dates (rare query pattern, write amplification)
CREATE INDEX idx_loans_next_payment ON loans(next_payment_date) WHERE status = 'ACTIVE';
CREATE INDEX idx_loans_overdue ON loans(overdue_days) WHERE overdue_days > 0;

-- Table: payment_schedules
-- Purpose: Scheduled payments for amortization
CREATE TABLE payment_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
    
    -- Payment Number and Date
    payment_number INTEGER NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    
    -- Payment Breakdown
    principal_amount monetary_amount NOT NULL,
    interest_amount monetary_amount NOT NULL,
    total_amount monetary_amount NOT NULL,
    
    -- Balance Tracking
    opening_balance monetary_amount NOT NULL,
    closing_balance monetary_amount NOT NULL,
    
    -- Status and Payment Tracking
    status payment_status NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMPTZ,
    paid_amount monetary_amount DEFAULT 0,
    
    -- Overdue Tracking
    days_overdue INTEGER NOT NULL DEFAULT 0,
    penalty_amount monetary_amount NOT NULL DEFAULT 0,
    compound_interest_amount monetary_amount NOT NULL DEFAULT 0,
    
    -- Statement Information
    statement_number VARCHAR(50),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT chk_payment_number_positive CHECK (payment_number > 0),
    CONSTRAINT chk_principal_positive CHECK (principal_amount >= 0),
    CONSTRAINT chk_interest_positive CHECK (interest_amount >= 0),
    CONSTRAINT chk_total_positive CHECK (total_amount > 0),
    CONSTRAINT chk_balance_consistency CHECK (opening_balance - principal_amount = closing_balance)
);

-- Indexes
CREATE INDEX idx_payment_schedules_loan ON payment_schedules(loan_id);
CREATE INDEX idx_payment_schedules_date ON payment_schedules(payment_date);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX idx_payment_schedules_overdue ON payment_schedules(days_overdue) WHERE days_overdue > 0;
CREATE INDEX idx_payment_schedules_statement ON payment_schedules(statement_number);

-- Composite index for overdue queries (DRE Recommendation)
CREATE INDEX idx_payment_schedules_status_date ON payment_schedules(status, payment_date)
WHERE status = 'PENDING';

-- Composite index for loan-specific date range queries (DRE Recommendation)
CREATE INDEX idx_payment_schedules_loan_date ON payment_schedules(loan_id, payment_date DESC);

-- Table: payments
-- Purpose: Actual payment transactions
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference VARCHAR(50) UNIQUE,
    
    -- Loan and Schedule Reference
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    schedule_id UUID REFERENCES payment_schedules(schedule_id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    
    -- Payment Details
    amount monetary_amount NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    payment_method payment_method NOT NULL,
    
    -- Payment Breakdown
    principal_amount monetary_amount NOT NULL DEFAULT 0,
    interest_amount monetary_amount NOT NULL DEFAULT 0,
    penalty_amount monetary_amount NOT NULL DEFAULT 0,
    
    -- Early Payment Benefits
    interest_saved monetary_amount,
    
    -- Payment Gateway Information
    payment_gateway VARCHAR(50),
    gateway_reference VARCHAR(100),
    gateway_response JSONB,
    bank_name VARCHAR(100),
    account_number VARCHAR(30),
    
    -- Verification
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES users(user_id),
    verified_at TIMESTAMPTZ,
    
    -- Status and Processing
    status payment_status NOT NULL DEFAULT 'PENDING',
    processed_at TIMESTAMPTZ,
    
    -- Receipt Generation
    receipt_number VARCHAR(50),
    receipt_generated_at TIMESTAMPTZ,
    
    -- Notes and Reference
    notes TEXT,
    reference_number VARCHAR(100),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT chk_payment_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_payment_date_not_future CHECK (payment_date <= CURRENT_TIMESTAMP),
    CONSTRAINT chk_payment_breakdown CHECK (
        principal_amount + interest_amount + penalty_amount = amount
    )
);

-- Indexes
CREATE INDEX idx_payments_reference ON payments(payment_reference);
CREATE INDEX idx_payments_loan ON payments(loan_id);
CREATE INDEX idx_payments_schedule ON payments(schedule_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_receipt ON payments(receipt_number);
CREATE INDEX idx_payments_gateway ON payments(gateway_reference);

-- Composite index for date range queries (DRE Recommendation)
CREATE INDEX idx_payments_loan_date_status ON payments(loan_id, payment_date DESC, status);

-- Table: transactions (Partitioned by Month)
-- Purpose: General financial transaction log
-- DRE Recommendation: Partitioned for performance at 100M+ rows
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_reference VARCHAR(50) UNIQUE,
    
    -- Transaction Details
    transaction_type transaction_type NOT NULL,
    amount monetary_amount NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'THB',
    
    -- Account References
    from_account VARCHAR(50),
    to_account VARCHAR(50),
    
    -- Related Entities
    user_id UUID REFERENCES users(user_id),
    loan_id UUID REFERENCES loans(loan_id),
    payment_id UUID REFERENCES payments(payment_id),
    
    -- Transaction Description
    description TEXT,
    metadata JSONB,
    
    -- Status and Processing
    status transaction_status NOT NULL DEFAULT 'PENDING',
    processed_at TIMESTAMPTZ,
    
    -- Timestamp (Partition Key)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_transaction_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_transaction_reference_format CHECK (transaction_reference ~ '^[A-Z0-9-]+$')
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for transactions
-- Partition: January 2026
CREATE TABLE transactions_2026_01 PARTITION OF transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Partition: February 2026
CREATE TABLE transactions_2026_02 PARTITION OF transactions
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Partition: March 2026
CREATE TABLE transactions_2026_03 PARTITION OF transactions
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Partition: April 2026
CREATE TABLE transactions_2026_04 PARTITION OF transactions
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Partition: May 2026
CREATE TABLE transactions_2026_05 PARTITION OF transactions
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Partition: June 2026
CREATE TABLE transactions_2026_06 PARTITION OF transactions
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Partition: July 2026
CREATE TABLE transactions_2026_07 PARTITION OF transactions
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Partition: August 2026
CREATE TABLE transactions_2026_08 PARTITION OF transactions
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Partition: September 2026
CREATE TABLE transactions_2026_09 PARTITION OF transactions
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Partition: October 2026
CREATE TABLE transactions_2026_10 PARTITION OF transactions
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- Partition: November 2026
CREATE TABLE transactions_2026_11 PARTITION OF transactions
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Partition: December 2026
CREATE TABLE transactions_2026_12 PARTITION OF transactions
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Default partition for future dates
CREATE TABLE transactions_default PARTITION OF transactions
    DEFAULT;

-- Indexes
CREATE INDEX idx_transactions_reference ON transactions(transaction_reference);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_loan ON transactions(loan_id);
CREATE INDEX idx_transactions_payment ON transactions(payment_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(created_at);

-- Table: disbursements
-- Purpose: Loan disbursement tracking
CREATE TABLE disbursements (
    disbursement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disbursement_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Loan Reference
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    disbursement_sequence INTEGER NOT NULL,
    
    -- Disbursement Details
    requested_amount monetary_amount NOT NULL,
    approved_amount monetary_amount,
    disbursed_amount monetary_amount NOT NULL DEFAULT 0,
    
    -- Purpose and Description
    purpose TEXT NOT NULL,
    notes TEXT,
    
    -- Dates
    requested_date TIMESTAMPTZ NOT NULL,
    approved_date TIMESTAMPTZ,
    disbursed_date TIMESTAMPTZ,
    next_disbursement_date TIMESTAMPTZ,
    
    -- Status and Workflow
    status disbursement_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    
    -- Approval Information
    approved_by UUID REFERENCES users(user_id),
    rejected_by UUID REFERENCES users(user_id),
    rejection_reason TEXT,
    
    -- Disbursement Execution
    disbursed_by UUID REFERENCES users(user_id),
    disbursement_method VARCHAR(50),
    reference_number VARCHAR(100),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT chk_disbursement_amount_positive CHECK (requested_amount > 0),
    CONSTRAINT chk_disbursement_sequence_positive CHECK (disbursement_sequence > 0),
    CONSTRAINT chk_disbursement_number_format CHECK (disbursement_number ~ '^[A-Z0-9-]+$')
);

-- Indexes
CREATE INDEX idx_disbursements_number ON disbursements(disbursement_number);
CREATE INDEX idx_disbursements_loan ON disbursements(loan_id);
CREATE INDEX idx_disbursements_status ON disbursements(status);
CREATE INDEX idx_disbursements_dates ON disbursements(requested_date, disbursed_date);

-- Table: documents
-- Purpose: Customer document storage and tracking
CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer Reference
    customer_id UUID REFERENCES customers(customer_id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loans(loan_id),
    
    -- Document Information
    document_type VARCHAR(50) NOT NULL,
    document_category document_category NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    
    -- Processing Status
    status document_status NOT NULL DEFAULT 'UPLOADED',
    processing_status VARCHAR(50),
    
    -- AI Processing
    ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
    ai_confidence_score DECIMAL(5,2),
    extracted_data JSONB,
    ai_warnings TEXT[],
    
    -- Review Information
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    review_status VARCHAR(20),
    review_notes TEXT,
    rejection_reason TEXT,
    
    -- Document Validity
    expiry_date TIMESTAMPTZ,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Soft Delete
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT chk_file_size_positive CHECK (file_size > 0),
    CONSTRAINT chk_file_hash_format CHECK (file_hash ~ '^[a-f0-9]{64}$')
);

-- Indexes
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_loan ON documents(loan_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_documents_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Table: contact_logs
-- Purpose: Customer communication tracking
CREATE TABLE contact_logs (
    contact_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer and Loan Reference
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    loan_id UUID REFERENCES loans(loan_id),
    
    -- Contact Details
    contact_date TIMESTAMPTZ NOT NULL,
    contact_method contact_method NOT NULL,
    contact_outcome contact_outcome,
    
    -- Contact Information
    officer_id UUID NOT NULL REFERENCES users(user_id),
    notes TEXT NOT NULL,
    
    -- Follow-up Information
    promised_date TIMESTAMPTZ,
    next_follow_up_date TIMESTAMPTZ,
    task_id UUID,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT chk_contact_date_not_future CHECK (contact_date <= CURRENT_TIMESTAMP)
);

-- Indexes
CREATE INDEX idx_contact_logs_customer ON contact_logs(customer_id);
CREATE INDEX idx_contact_logs_loan ON contact_logs(loan_id);
CREATE INDEX idx_contact_logs_officer ON contact_logs(officer_id);
CREATE INDEX idx_contact_logs_date ON contact_logs(contact_date);
CREATE INDEX idx_contact_logs_followup ON contact_logs(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;

-- Table: notifications
-- Purpose: System notifications for users
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    user_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Notification Content
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Action Information
    link VARCHAR(500),
    action_id VARCHAR(50),
    action_label VARCHAR(100),
    
    -- Priority and Status
    priority notification_priority NOT NULL DEFAULT 'MEDIUM',
    status notification_status NOT NULL DEFAULT 'PENDING',
    
    -- Delivery Tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Deduplication
    event_id VARCHAR(100),
    dedup_key VARCHAR(100),
    dedup_window_hours INTEGER DEFAULT 24,
    
    -- Metadata
    metadata JSONB,
    
    -- Archival
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_notification_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT chk_notification_message_not_empty CHECK (LENGTH(TRIM(message)) > 0)
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NOT NULL;
CREATE INDEX idx_notifications_archived ON notifications(archived) WHERE archived = TRUE;
CREATE INDEX idx_notifications_event ON notifications(event_id) WHERE event_id IS NOT NULL;

-- Table: notification_actions
-- Purpose: Actionable buttons for notifications
CREATE TABLE notification_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification Reference
    notification_type VARCHAR(50) NOT NULL,
    
    -- Action Details
    action_key VARCHAR(50) NOT NULL,
    action_label VARCHAR(100) NOT NULL,
    action_link VARCHAR(500) NOT NULL,
    
    -- Access Control
    required_roles TEXT[],
    required_permissions TEXT[],
    requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_notification_actions_type ON notification_actions(notification_type);
CREATE INDEX idx_notification_actions_key ON notification_actions(action_key);

-- Table: notification_audience_rules
-- Purpose: Define which users/roles should receive notification types
CREATE TABLE notification_audience_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification Type
    notification_type VARCHAR(50) NOT NULL,
    
    -- Audience Definition
    allowed_roles TEXT[] NOT NULL,
    allowed_organizations TEXT[] NOT NULL DEFAULT ARRAY['all']::TEXT[],
    
    -- Description
    description TEXT,
    
    -- Validity
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_notification_audience_type ON notification_audience_rules(notification_type);
CREATE INDEX idx_notification_audience_active ON notification_audience_rules(is_active) WHERE is_active = TRUE;

-- Table: approval_limits
-- Purpose: Role-based approval limits for transactions
CREATE TABLE approval_limits (
    limit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Role and Level
    role user_role NOT NULL,
    approval_level VARCHAR(50) NOT NULL,
    
    -- Amount Limits
    min_amount monetary_amount NOT NULL DEFAULT 0,
    max_amount monetary_amount,
    
    -- Workflow Configuration
    requires_next_level BOOLEAN NOT NULL DEFAULT FALSE,
    sla_hours INTEGER NOT NULL DEFAULT 24,
    
    -- Status
    status organization_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Validity
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT chk_approval_amount_range CHECK (min_amount < max_amount OR max_amount IS NULL)
);

-- Indexes
CREATE INDEX idx_approval_limits_role ON approval_limits(role);
CREATE INDEX idx_approval_limits_status ON approval_limits(status);
CREATE INDEX idx_approval_limits_effective ON approval_limits(effective_from, effective_until);

-- Table: product_budgets
-- Purpose: Budget management for loan products
CREATE TABLE product_budgets (
    budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product Reference
    product_id UUID NOT NULL REFERENCES loan_products(product_id),
    product_code VARCHAR(20) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Fiscal Period
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER,
    
    -- Budget Amounts
    total_budget_amount monetary_amount NOT NULL,
    committed_amount monetary_amount NOT NULL DEFAULT 0,
    disbursed_amount monetary_amount NOT NULL DEFAULT 0,
    pending_amount monetary_amount NOT NULL DEFAULT 0,
    available_amount monetary_amount GENERATED ALWAYS AS (
        total_budget_amount - committed_amount - disbursed_amount
    ) STORED,
    
    -- Utilization Metrics
    utilization_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_budget_amount > 0 
        THEN ((committed_amount + disbursed_amount) * 100.0 / total_budget_amount)
        ELSE 0 END
    ) STORED,
    
    -- Thresholds
    warning_threshold DECIMAL(5,2) DEFAULT 80.00,
    critical_threshold DECIMAL(5,2) DEFAULT 95.00,
    budget_status VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN (committed_amount + disbursed_amount) / total_budget_amount >= 0.95 THEN 'CRITICAL'
            WHEN (committed_amount + disbursed_amount) / total_budget_amount >= 0.80 THEN 'WARNING'
            ELSE 'ACTIVE'
        END
    ) STORED,
    
    -- Budget Management
    budget_owner_id UUID REFERENCES users(user_id),
    notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_product_budgets_product ON product_budgets(product_id);
CREATE INDEX idx_product_budgets_fiscal ON product_budgets(fiscal_year, fiscal_quarter);
CREATE INDEX idx_product_budgets_status ON product_budgets(budget_status);

-- Table: budget_consumption
-- Purpose: Track budget consumption by loan disbursements
CREATE TABLE budget_consumption (
    consumption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Budget Reference
    budget_id UUID NOT NULL REFERENCES product_budgets(budget_id),
    
    -- Loan Reference
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    
    -- Amount Details
    requested_amount monetary_amount NOT NULL,
    approved_amount monetary_amount NOT NULL,
    disbursed_amount monetary_amount NOT NULL DEFAULT 0,
    released_amount monetary_amount NOT NULL DEFAULT 0,
    
    -- Consumption Type
    consumption_type VARCHAR(50) NOT NULL, -- COMMITMENT, DISBURSEMENT, RELEASE
    
    -- Status and Dates
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    consumption_date DATE NOT NULL,
    consumption_time TIMESTAMPTZ NOT NULL,
    
    -- Processing
    processed_by UUID REFERENCES users(user_id),
    processed_at TIMESTAMPTZ,
    
    -- Release Information
    released_by UUID REFERENCES users(user_id),
    released_at TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_budget_consumption_budget ON budget_consumption(budget_id);
CREATE INDEX idx_budget_consumption_loan ON budget_consumption(loan_id);
CREATE INDEX idx_budget_consumption_org ON budget_consumption(organization_id);
CREATE INDEX idx_budget_consumption_date ON budget_consumption(consumption_date);

-- Table: year_interest_tiers
-- Purpose: Year-based interest rate tiers for loan products
CREATE TABLE year_interest_tiers (
    tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product Reference
    product_id UUID NOT NULL REFERENCES loan_products(product_id),
    
    -- Tier Type
    tier_type VARCHAR(20) NOT NULL, -- FIXED, VARIABLE, HYBRID
    
    -- Year Range
    start_year INTEGER NOT NULL,
    end_year VARCHAR(20), -- 'END' or specific year
    
    -- Interest Rate Configuration
    rate interest_rate,
    formula TEXT,
    min_rate interest_rate,
    max_rate interest_rate,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_year_interest_tiers_product ON year_interest_tiers(product_id);
CREATE INDEX idx_year_interest_tiers_years ON year_interest_tiers(start_year, end_year);

-- Table: loan_interest_history
-- Purpose: Historical record of interest calculations
CREATE TABLE loan_interest_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Loan Reference
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    
    -- Payment Information
    payment_number INTEGER NOT NULL,
    
    -- Interest Calculation Details
    outstanding_balance monetary_amount NOT NULL,
    applied_rate interest_rate NOT NULL,
    tier_name VARCHAR(100),
    grace_period_days INTEGER NOT NULL DEFAULT 0,
    interest_amount monetary_amount NOT NULL,
    
    -- Calculation Metadata
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_date TIMESTAMPTZ NOT NULL,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_loan_interest_history_loan ON loan_interest_history(loan_id);
CREATE INDEX idx_loan_interest_history_payment ON loan_interest_history(payment_number);
CREATE INDEX idx_loan_interest_history_effective ON loan_interest_history(effective_date);

-- Table: next_payment_invoices
-- Purpose: Pre-generated invoices for next payment
CREATE TABLE next_payment_invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- References
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    schedule_id UUID NOT NULL REFERENCES payment_schedules(schedule_id),
    
    -- Invoice Data
    invoice_data JSONB NOT NULL,
    
    -- Status and Dates
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    valid_until TIMESTAMPTZ NOT NULL,
    
    -- Generation Information
    generated_by UUID NOT NULL REFERENCES users(user_id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Sending Information
    sent_at TIMESTAMPTZ,
    sent_via VARCHAR(50),
    sent_by UUID REFERENCES users(user_id),
    
    -- Payment Information
    paid_at TIMESTAMPTZ,
    paid_amount monetary_amount,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(50),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_next_payment_invoices_number ON next_payment_invoices(invoice_number);
CREATE INDEX idx_next_payment_invoices_loan ON next_payment_invoices(loan_id);
CREATE INDEX idx_next_payment_invoices_customer ON next_payment_invoices(customer_id);
CREATE INDEX idx_next_payment_invoices_schedule ON next_payment_invoices(schedule_id);
CREATE INDEX idx_next_payment_invoices_status ON next_payment_invoices(status);
CREATE INDEX idx_next_payment_invoices_valid ON next_payment_invoices(valid_until) WHERE valid_until > CURRENT_TIMESTAMP;

-- Table: payment_receipts
-- Purpose: Receipt generation for payments
CREATE TABLE payment_receipts (
    receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- References
    payment_id UUID NOT NULL REFERENCES payments(payment_id),
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    invoice_id UUID REFERENCES next_payment_invoices(invoice_id),
    
    -- Receipt Details
    amount monetary_amount NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    receipt_data JSONB NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    
    -- Issuance Information
    issued_by UUID NOT NULL REFERENCES users(user_id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Sending Information
    sent_at TIMESTAMPTZ,
    sent_via VARCHAR(50),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_payment_receipts_number ON payment_receipts(receipt_number);
CREATE INDEX idx_payment_receipts_payment ON payment_receipts(payment_id);
CREATE INDEX idx_payment_receipts_loan ON payment_receipts(loan_id);
CREATE INDEX idx_payment_receipts_customer ON payment_receipts(customer_id);
CREATE INDEX idx_payment_receipts_invoice ON payment_receipts(invoice_id);

-- Table: invoices
-- Purpose: General invoice management
CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- References
    schedule_id UUID NOT NULL REFERENCES payment_schedules(schedule_id),
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    
    -- Invoice Details
    invoice_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    invoice_data JSONB NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    
    -- Generation Information
    generated_by UUID NOT NULL REFERENCES users(user_id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Delivery Information
    sent_at TIMESTAMPTZ,
    sent_via VARCHAR(50),
    viewed_at TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_schedule ON invoices(schedule_id);
CREATE INDEX idx_invoices_loan ON invoices(loan_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Table: invoice_access_logs
-- Purpose: Track access to invoices
CREATE TABLE invoice_access_logs (
    access_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice Reference
    resource_id VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    
    -- Access Details
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL,
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_invoice_access_logs_resource ON invoice_access_logs(resource_id);
CREATE INDEX idx_invoice_access_logs_customer ON invoice_access_logs(customer_id);
CREATE INDEX idx_invoice_access_logs_attempted ON invoice_access_logs(attempted_at);

-- Table: calendar_events
-- Purpose: Calendar and event management
CREATE TABLE calendar_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization Reference
    organization_id UUID REFERENCES organizations(organization_id),
    
    -- Event Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50),
    
    -- Event Timing
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Recurrence
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule TEXT,
    
    -- Reminders
    reminder_minutes INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    
    -- Location and Attendees
    location VARCHAR(255),
    attendees TEXT[],
    
    -- Related Entities
    loan_id UUID REFERENCES loans(loan_id),
    customer_id UUID REFERENCES customers(customer_id),
    
    -- Creation
    created_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_calendar_events_organization ON calendar_events(organization_id);
CREATE INDEX idx_calendar_events_start ON calendar_events(start_date);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_loan ON calendar_events(loan_id);
CREATE INDEX idx_calendar_events_customer ON calendar_events(customer_id);

-- Table: conversation_states
-- Purpose: LINE bot conversation flow state management
CREATE TABLE conversation_states (
    state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- LINE User Reference
    line_user_id VARCHAR(255) NOT NULL,
    
    -- Conversation Flow
    flow VARCHAR(50) NOT NULL,
    step VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    
    -- Flow Data
    data JSONB,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_conversation_states_line_user ON conversation_states(line_user_id);
CREATE INDEX idx_conversation_states_expires ON conversation_states(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;

-- Table: registration_tokens
-- Purpose: LINE account registration tokens
CREATE TABLE registration_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- LINE User Reference
    line_user_id VARCHAR(255) NOT NULL,
    
    -- Token Information
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(user_id),
    
    -- Validity
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_registration_tokens_line_user ON registration_tokens(line_user_id);
CREATE INDEX idx_registration_tokens_token ON registration_tokens(token);
CREATE INDEX idx_registration_tokens_expires ON registration_tokens(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;

-- Table: promptpay_qr_codes
-- Purpose: PromptPay QR code generation and tracking
CREATE TABLE promptpay_qr_codes (
    qr_code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Loan Reference
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    
    -- Payment Reference
    payment_ref VARCHAR(50) NOT NULL,
    amount_expected monetary_amount NOT NULL,
    
    -- QR Code Data
    qr_code_data TEXT NOT NULL,
    
    -- Status and Dates
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_promptpay_qr_codes_loan ON promptpay_qr_codes(loan_id);
CREATE INDEX idx_promptpay_qr_codes_payment_ref ON promptpay_qr_codes(payment_ref);
CREATE INDEX idx_promptpay_qr_codes_status ON promptpay_qr_codes(status);
CREATE INDEX idx_promptpay_qr_codes_expires ON promptpay_qr_codes(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;

-- Table: thai_banks
-- Purpose: Thai bank reference data
CREATE TABLE thai_banks (
    bank_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Bank Information
    bank_code VARCHAR(10) NOT NULL UNIQUE,
    bank_name VARCHAR(100) NOT NULL,
    bank_name_th VARCHAR(100) NOT NULL,
    bank_name_en VARCHAR(100) NOT NULL,
    
    -- Branding
    logo_url TEXT,
    color_code VARCHAR(10),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_thai_banks_code ON thai_banks(bank_code);
CREATE INDEX idx_thai_banks_active ON thai_banks(is_active) WHERE is_active = TRUE;

-- Table: credit_lines
-- Purpose: Credit line management
CREATE TABLE credit_lines (
    credit_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_line_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Customer Reference
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    
    -- Credit Line Details
    approved_limit monetary_amount NOT NULL,
    current_balance monetary_amount NOT NULL DEFAULT 0,
    available_balance monetary_amount GENERATED ALWAYS AS (
        approved_limit - current_balance
    ) STORED,
    utilization_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN approved_limit > 0 
        THEN (current_balance * 100.0 / approved_limit)
        ELSE 0 END
    ) STORED,
    
    -- Interest Configuration
    interest_rate interest_rate NOT NULL,
    
    -- Validity Period
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    review_date DATE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    
    -- Management
    created_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_credit_lines_number ON credit_lines(credit_line_number);
CREATE INDEX idx_credit_lines_customer ON credit_lines(customer_id);
CREATE INDEX idx_credit_lines_status ON credit_lines(status);
CREATE INDEX idx_credit_lines_expiry ON credit_lines(expiry_date) WHERE expiry_date > CURRENT_DATE;

-- Table: credit_line_drawdowns
-- Purpose: Credit line drawdown tracking
CREATE TABLE credit_line_drawdowns (
    drawdown_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Credit Line Reference
    credit_line_id UUID NOT NULL REFERENCES credit_lines(credit_line_id),
    drawdown_number VARCHAR(50) NOT NULL,
    
    -- Drawdown Details
    amount monetary_amount NOT NULL,
    purpose TEXT NOT NULL,
    
    -- Dates
    drawdown_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    
    -- Interest Configuration
    interest_rate interest_rate NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    
    -- Creation
    created_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_credit_line_drawdowns_line ON credit_line_drawdowns(credit_line_id);
CREATE INDEX idx_credit_line_drawdowns_number ON credit_line_drawdowns(drawdown_number);
CREATE INDEX idx_credit_line_drawdowns_date ON credit_line_drawdowns(drawdown_date);

-- Table: customer_active_products
-- Purpose: Track active loan products per customer
CREATE TABLE customer_active_products (
    active_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    loan_product_id UUID NOT NULL REFERENCES loan_products(product_id),
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    
    -- Activation Details
    activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

-- Indexes
CREATE INDEX idx_customer_active_products_customer ON customer_active_products(customer_id);
CREATE INDEX idx_customer_active_products_product ON customer_active_products(loan_product_id);
CREATE INDEX idx_customer_active_products_loan ON customer_active_products(loan_id);
CREATE INDEX idx_customer_active_products_status ON customer_active_products(status);

-- Table: aging_analysis
-- Purpose: Loan aging bucket analysis
CREATE TABLE aging_analysis (
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    
    -- Aging Details
    current_age INTEGER NOT NULL,
    aging_bucket VARCHAR(20) NOT NULL, -- CURRENT, 1-30, 31-60, 61-90, 90+
    
    -- Overdue Amounts
    principal_overdue monetary_amount,
    interest_overdue monetary_amount,
    penalty_overdue monetary_amount,
    total_overdue monetary_amount,
    
    -- Collection Management
    collection_agent_id UUID REFERENCES users(user_id),
    collection_strategy VARCHAR(50),
    next_action_date DATE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_aging_analysis_loan ON aging_analysis(loan_id);
CREATE INDEX idx_aging_analysis_customer ON aging_analysis(customer_id);
CREATE INDEX idx_aging_analysis_bucket ON aging_analysis(aging_bucket);
CREATE INDEX idx_aging_analysis_status ON aging_analysis(status);

-- Table: aml_checks
-- Purpose: Anti-money laundering checks
CREATE TABLE aml_checks (
    aml_check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer Reference
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    
    -- Check Details
    check_type VARCHAR(50) NOT NULL,
    check_result VARCHAR(20) NOT NULL, -- PASS, FAIL, REVIEW
    
    -- Match Information
    match_score DECIMAL(5,2),
    matched_names JSONB,
    check_data JSONB,
    
    -- Processing
    performed_by UUID REFERENCES users(user_id),
    performed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_aml_checks_customer ON aml_checks(customer_id);
CREATE INDEX idx_aml_checks_type ON aml_checks(check_type);
CREATE INDEX idx_aml_checks_result ON aml_checks(check_result);
CREATE INDEX idx_aml_checks_performed ON aml_checks(performed_at);

-- Table: collection_workflow_steps
-- Purpose: Collection workflow rules
CREATE TABLE collection_workflow_steps (
    workflow_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Overdue Range
    days_overdue_from INTEGER NOT NULL,
    days_overdue_to INTEGER,
    
    -- Action Configuration
    action_type VARCHAR(50) NOT NULL,
    template_id VARCHAR(50),
    priority VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, URGENT
    assigned_role user_role NOT NULL,
    sla_hours INTEGER NOT NULL,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Creation
    created_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_collection_workflow_steps_overdue ON collection_workflow_steps(days_overdue_from, days_overdue_to);
CREATE INDEX idx_collection_workflow_steps_active ON collection_workflow_steps(is_active) WHERE is_active = TRUE;

-- Table: suspicious_transaction_reports
-- Purpose: Suspicious Transaction Reporting (STR)
CREATE TABLE suspicious_transaction_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- References
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    transaction_id UUID REFERENCES transactions(transaction_id),
    
    -- Suspicion Details
    suspicion_type VARCHAR(50) NOT NULL,
    suspicion_details TEXT NOT NULL,
    
    -- Reporting
    reported_by UUID NOT NULL REFERENCES users(user_id),
    reported_at TIMESTAMPTZ,
    review_status VARCHAR(20),
    submitted_to VARCHAR(50),
    submitted_at TIMESTAMPTZ,
    amlo_reference VARCHAR(50),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_suspicious_reports_number ON suspicious_transaction_reports(report_number);
CREATE INDEX idx_suspicious_reports_customer ON suspicious_transaction_reports(customer_id);
CREATE INDEX idx_suspicious_reports_transaction ON suspicious_transaction_reports(transaction_id);
CREATE INDEX idx_suspicious_reports_status ON suspicious_transaction_reports(review_status);

-- Table: task_assignments
-- Purpose: Task assignment and tracking
CREATE TABLE task_assignments (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Task Details
    task_type VARCHAR(50) NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    
    -- Assignment
    assigned_to UUID NOT NULL REFERENCES users(user_id),
    assigned_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Priority and Status
    priority VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, URGENT
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    -- Dates
    due_date DATE NOT NULL,
    completion_date DATE,
    
    -- Related Entity
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    
    -- Notes
    notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_task_assignments_assigned_by ON task_assignments(assigned_by);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_task_assignments_due_date ON task_assignments(due_date);
CREATE INDEX idx_task_assignments_entity ON task_assignments(related_entity_type, related_entity_id);

-- Table: token_refresh_audit
-- Purpose: Audit token refresh operations
CREATE TABLE token_refresh_audit (
    refresh_audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and Session
    user_id UUID NOT NULL REFERENCES users(user_id),
    session_id UUID NOT NULL REFERENCES sessions(session_id),
    
    -- Token Information
    old_access_token TEXT,
    new_access_token TEXT,
    old_refresh_token TEXT,
    new_refresh_token TEXT,
    
    -- Request Information
    ip_address VARCHAR(50),
    user_agent TEXT,
    refresh_reason VARCHAR(50),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_token_refresh_audit_user ON token_refresh_audit(user_id);
CREATE INDEX idx_token_refresh_audit_session ON token_refresh_audit(session_id);
CREATE INDEX idx_token_refresh_audit_created ON token_refresh_audit(created_at);

-- Table: privacy_consents
-- Purpose: PDPA consent tracking
CREATE TABLE privacy_consents (
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Customer Reference
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    
    -- Consent Details
    consent_type VARCHAR(50) NOT NULL,
    consent_version VARCHAR(20) NOT NULL,
    consent_text TEXT NOT NULL,
    
    -- Consent Status
    given BOOLEAN NOT NULL,
    given_at TIMESTAMPTZ,
    withdrawn BOOLEAN NOT NULL DEFAULT FALSE,
    withdrawn_at TIMESTAMPTZ,
    
    -- Request Information
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_privacy_consents_customer ON privacy_consents(customer_id);
CREATE INDEX idx_privacy_consents_type ON privacy_consents(consent_type);
CREATE INDEX idx_privacy_consents_given ON privacy_consents(given_at) WHERE given = TRUE;

-- Table: payment_timeline_events
-- Purpose: Payment timeline event tracking
CREATE TABLE payment_timeline_events (
    timeline_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    schedule_id UUID REFERENCES payment_schedules(schedule_id),
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    -- Error Handling
    error_message TEXT,
    
    -- Retry Logic
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_payment_timeline_events_loan ON payment_timeline_events(loan_id);
CREATE INDEX idx_payment_timeline_events_schedule ON payment_timeline_events(schedule_id);
CREATE INDEX idx_payment_timeline_events_scheduled ON payment_timeline_events(scheduled_date);
CREATE INDEX idx_payment_timeline_events_status ON payment_timeline_events(status);

-- Table: principal_prepayments
-- Purpose: Principal prepayment tracking
CREATE TABLE principal_prepayments (
    prepayment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    loan_id UUID NOT NULL REFERENCES loans(loan_id),
    schedule_id UUID REFERENCES payment_schedules(schedule_id),
    
    -- Prepayment Details
    amount monetary_amount NOT NULL,
    prepayment_date DATE NOT NULL,
    
    -- Impact Calculation
    interest_saved monetary_amount,
    new_monthly_payment monetary_amount,
    new_maturity_date DATE,
    penalty_amount monetary_amount NOT NULL DEFAULT 0,
    
    -- Processing
    processed_by UUID REFERENCES users(user_id),
    processed_at TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_principal_prepayments_loan ON principal_prepayments(loan_id);
CREATE INDEX idx_principal_prepayments_schedule ON principal_prepayments(schedule_id);
CREATE INDEX idx_principal_prepayments_date ON principal_prepayments(prepayment_date);

-- Table: expenses
-- Purpose: Branch expense tracking
CREATE TABLE expenses (
    expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization Reference
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    
    -- Expense Details
    category VARCHAR(50) NOT NULL, -- OFFICE_SUPPLIES, UTILITIES, TRAVEL, MARKETING, MAINTENANCE, OTHER
    amount monetary_amount NOT NULL,
    description TEXT NOT NULL,
    receipt_path TEXT,
    
    -- Status and Workflow
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, REIMBURSED
    expense_date DATE NOT NULL,
    
    -- Approval Information
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(user_id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Reimbursement
    reimbursed BOOLEAN NOT NULL DEFAULT FALSE,
    reimbursed_at TIMESTAMPTZ,
    reimbursed_by UUID REFERENCES users(user_id),
    
    -- Creation
    created_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_expenses_organization ON expenses(organization_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- Table: product_configs
-- Purpose: Product configuration management
CREATE TABLE product_configs (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product Information
    product_code VARCHAR(20) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuration
    config JSONB NOT NULL,
    
    -- Status and Validity
    status organization_status NOT NULL DEFAULT 'ACTIVE',
    active_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active_until TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Creation
    created_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_product_configs_code ON product_configs(product_code);
CREATE INDEX idx_product_configs_status ON product_configs(status);
CREATE INDEX idx_product_configs_active ON product_configs(active_from, active_until) WHERE active_until IS NULL OR active_until > CURRENT_TIMESTAMP;

-- ============================================================================
-- AUDIT TRAIL TABLES (Immutable, Append-Only, Partitioned)
-- ============================================================================

-- Table: audit_logs (Partitioned by Month)
-- Purpose: Immutable audit trail for all system operations
-- DRE Recommendation: Partitioned for performance at 100M+ rows
CREATE TABLE audit_logs (
    audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action Information
    action audit_action NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    
    -- User Information
    user_id UUID REFERENCES users(user_id),
    user_role user_role,
    username VARCHAR(100),
    
    -- Change Details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    session_id UUID,
    
    -- Additional Metadata
    metadata JSONB,
    
    -- Timestamp (Partition Key)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit_logs
-- Partition: January 2026
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Partition: February 2026
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Partition: March 2026
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Partition: April 2026
CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Partition: May 2026
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Partition: June 2026
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Partition: July 2026
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Partition: August 2026
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Partition: September 2026
CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Partition: October 2026
CREATE TABLE audit_logs_2026_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- Partition: November 2026
CREATE TABLE audit_logs_2026_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Partition: December 2026
CREATE TABLE audit_logs_2026_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Default partition for future dates
CREATE TABLE audit_logs_default PARTITION OF audit_logs
    DEFAULT;

-- Indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);

-- Table: data_access_logs
-- Purpose: Track access to sensitive customer data
CREATE TABLE data_access_logs (
    access_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Information
    user_id UUID NOT NULL REFERENCES users(user_id),
    user_role user_role,
    username VARCHAR(100),
    
    -- Customer Information
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    
    -- Access Details
    access_type VARCHAR(50) NOT NULL, -- VIEW, EXPORT, MODIFY, DELETE
    accessed_fields TEXT[],
    access_purpose TEXT,
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_data_access_user ON data_access_logs(user_id);
CREATE INDEX idx_data_access_customer ON data_access_logs(customer_id);
CREATE INDEX idx_data_access_type ON data_access_logs(access_type);
CREATE INDEX idx_data_access_created ON data_access_logs(created_at DESC);

-- ============================================================================
-- SECURITY TABLES
-- ============================================================================

-- Table: sessions
-- Purpose: User session management
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Reference
    user_id UUID NOT NULL REFERENCES users(user_id),
    
    -- Session Tokens
    access_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    
    -- Grace Period Fields (prevent race conditions)
    previous_access_token TEXT,
    previous_refresh_token TEXT,
    previous_token_expires_at TIMESTAMPTZ,
    
    -- Session Information
    ip_address INET,
    user_agent TEXT,
    
    -- Session Status
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(access_token);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE is_valid = TRUE;

-- Table: blocked_ips
-- Purpose: IP blacklist for security
CREATE TABLE blocked_ips (
    blocked_ip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- IP Information
    ip_address INET NOT NULL,
    ip_range VARCHAR(50),
    
    -- Blocking Details
    reason TEXT NOT NULL,
    blocked_by UUID REFERENCES users(user_id),
    
    -- Blocking Period
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_expires ON blocked_ips(expires_at) WHERE expires_at IS NOT NULL;

-- Table: security_events
-- Purpose: Security event tracking with AMLO compliance
CREATE TABLE security_events (
    security_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Classification
    event_type VARCHAR(50) NOT NULL, -- SQL_INJECTION, XSS, BRUTE_FORCE, etc.
    threat_level VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Event Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- User and Request Info
    user_id UUID REFERENCES users(user_id),
    ip_address INET NOT NULL,
    user_agent TEXT,
    endpoint VARCHAR(255),
    http_method VARCHAR(10),
    payload JSONB,
    
    -- Attack Detection
    attack_type VARCHAR(50), -- SQL_INJECTION, XSS, AUTH_BYPASS, etc.
    attack_signature VARCHAR(100), -- Pattern matched
    detected_by VARCHAR(50), -- WAF, IDS, RULE_ENGINE, etc.
    
    -- Response and Mitigation
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT,
    blocked_method VARCHAR(50), -- IP_BLOCK, ACCOUNT_LOCK, etc.
    
    -- Resolution Tracking
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES users(user_id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- AMLO Reporting (Anti-Money Laundering Office)
    amlo_report_required BOOLEAN NOT NULL DEFAULT FALSE,
    amlo_report_id VARCHAR(50),
    amlo_submitted_at TIMESTAMPTZ,
    amlo_status VARCHAR(20), -- NOT_REQUIRED, PENDING, SUBMITTED, ACCEPTED, REJECTED
    
    -- Incident Management
    incident_number VARCHAR(50),
    incident_priority VARCHAR(20), -- P1, P2, P3, P4
    assigned_to UUID REFERENCES users(user_id),
    assigned_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_threat ON security_events(threat_level);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX idx_security_events_attack_type ON security_events(attack_type);
CREATE INDEX idx_security_events_blocked ON security_events(blocked) WHERE blocked = TRUE;
CREATE INDEX idx_security_events_amlo ON security_events(amlo_report_required) WHERE amlo_report_required = TRUE;
CREATE INDEX idx_security_events_incident ON security_events(incident_number) WHERE incident_number IS NOT NULL;

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- Table: system_configs
-- Purpose: System-wide configuration parameters
CREATE TABLE system_configs (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Configuration Key
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    
    -- Configuration Metadata
    config_category VARCHAR(50) NOT NULL,
    config_description TEXT,
    data_type VARCHAR(20) NOT NULL, -- STRING, NUMBER, BOOLEAN, JSON
    
    -- Validity
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMPTZ,
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_system_configs_key ON system_configs(config_key);
CREATE INDEX idx_system_configs_category ON system_configs(config_category);
CREATE INDEX idx_system_configs_active ON system_configs(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- VIEWS FOR REPORTING (Read-Only, Optimized)
-- ============================================================================

-- View: loan_summary
-- Purpose: High-level loan summary for reporting
CREATE VIEW loan_summary AS
SELECT 
    l.loan_id,
    l.loan_number,
    l.customer_id,
    c.customer_code,
    c.business_name,
    l.organization_id,
    o.organization_code,
    o.organization_name,
    l.officer_id,
    u.username AS officer_name,
    l.product_id,
    lp.product_name,
    l.principal_amount,
    l.disbursed_amount,
    l.outstanding_balance,
    l.interest_rate,
    l.status AS loan_status,
    l.application_date,
    l.approval_date,
    l.disbursement_date,
    l.maturity_date,
    l.next_payment_date,
    l.next_payment_amount,
    l.overdue_days,
    l.dscr,
    l.risk_level,
    COUNT(DISTINCT ps.schedule_id) AS total_schedules,
    COUNT(DISTINCT CASE WHEN ps.status = 'PAID' THEN ps.schedule_id END) AS paid_schedules,
    COUNT(DISTINCT CASE WHEN ps.status = 'PENDING' THEN ps.schedule_id END) AS pending_schedules,
    COUNT(DISTINCT CASE WHEN ps.days_overdue > 0 THEN ps.schedule_id END) AS overdue_schedules
FROM loans l
JOIN customers c ON l.customer_id = c.customer_id
JOIN organizations o ON l.organization_id = o.organization_id
JOIN users u ON l.officer_id = u.user_id
LEFT JOIN loan_products lp ON l.product_id = lp.product_id
LEFT JOIN payment_schedules ps ON l.loan_id = ps.loan_id
GROUP BY l.loan_id, c.customer_id, o.organization_id, u.user_id, lp.product_id;

-- View: payment_summary
-- Purpose: Payment summary for reporting
CREATE VIEW payment_summary AS
SELECT 
    p.payment_id,
    p.payment_reference,
    p.loan_id,
    l.loan_number,
    p.customer_id,
    c.customer_code,
    c.business_name,
    p.amount,
    p.principal_amount,
    p.interest_amount,
    p.penalty_amount,
    p.payment_date,
    p.payment_method,
    p.status AS payment_status,
    p.verified,
    p.receipt_number,
    l.officer_id,
    u.username AS officer_name,
    p.created_by,
    creator.username AS creator_name
FROM payments p
JOIN loans l ON p.loan_id = l.loan_id
JOIN customers c ON p.customer_id = c.customer_id
JOIN users u ON l.officer_id = u.user_id
JOIN users creator ON p.created_by = creator.user_id;

-- View: customer_portfolio
-- Purpose: Customer portfolio overview
CREATE VIEW customer_portfolio AS
SELECT 
    c.customer_id,
    c.customer_code,
    c.business_name,
    c.organization_id,
    o.organization_code,
    o.organization_name,
    c.assigned_officer_id,
    u.username AS officer_name,
    c.status AS customer_status,
    c.risk_level,
    c.annual_revenue,
    c.total_assets,
    c.total_liabilities,
    c.credit_score,
    COUNT(DISTINCT l.loan_id) AS total_loans,
    COALESCE(SUM(l.principal_amount), 0) AS total_loan_amount,
    COALESCE(SUM(l.outstanding_balance), 0) AS total_outstanding,
    COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active_loans,
    COALESCE(SUM(CASE WHEN l.overdue_days > 0 THEN 1 ELSE 0 END), 0) AS overdue_loans,
    COALESCE(SUM(l.overdue_amount), 0) AS total_overdue_amount
FROM customers c
JOIN organizations o ON c.organization_id = o.organization_id
LEFT JOIN users u ON c.assigned_officer_id = u.user_id
LEFT JOIN loans l ON c.customer_id = l.customer_id AND l.is_deleted = FALSE
GROUP BY c.customer_id, o.organization_id, u.user_id;

-- ============================================================================
-- MATERIALIZED VIEWS (DRE Recommendation for Performance)
-- ============================================================================

-- Materialized View: loan_summary_mv
-- Purpose: Pre-computed loan summary for high-performance reporting
-- DRE Recommendation: Materialized view to avoid expensive JOINs and aggregations
-- Refresh Strategy: Hourly refresh with CONCURRENTLY option
CREATE MATERIALIZED VIEW loan_summary_mv AS
SELECT 
    l.loan_id,
    l.loan_number,
    l.customer_id,
    c.customer_code,
    c.business_name,
    l.organization_id,
    o.organization_code,
    o.organization_name,
    l.officer_id,
    u.username AS officer_name,
    l.product_id,
    lp.product_name,
    l.principal_amount,
    l.disbursed_amount,
    l.outstanding_balance,
    l.interest_rate,
    l.status AS loan_status,
    l.application_date,
    l.approval_date,
    l.disbursement_date,
    l.maturity_date,
    l.next_payment_date,
    l.next_payment_amount,
    l.overdue_days,
    l.dscr,
    l.risk_level,
    COUNT(DISTINCT ps.schedule_id) AS total_schedules,
    COUNT(DISTINCT CASE WHEN ps.status = 'PAID' THEN ps.schedule_id END) AS paid_schedules,
    COUNT(DISTINCT CASE WHEN ps.status = 'PENDING' THEN ps.schedule_id END) AS pending_schedules,
    COUNT(DISTINCT CASE WHEN ps.days_overdue > 0 THEN ps.schedule_id END) AS overdue_schedules
FROM loans l
JOIN customers c ON l.customer_id = c.customer_id
JOIN organizations o ON l.organization_id = o.organization_id
JOIN users u ON l.officer_id = u.user_id
LEFT JOIN loan_products lp ON l.product_id = lp.product_id
LEFT JOIN payment_schedules ps ON l.loan_id = ps.loan_id
GROUP BY l.loan_id, c.customer_id, o.organization_id, u.user_id, lp.product_id;

-- Create index on materialized view for fast lookups
CREATE INDEX idx_loan_summary_mv_loan_id ON loan_summary_mv(loan_id);
CREATE INDEX idx_loan_summary_mv_customer ON loan_summary_mv(customer_id);
CREATE INDEX idx_loan_summary_mv_officer ON loan_summary_mv(officer_id);
CREATE INDEX idx_loan_summary_mv_status ON loan_summary_mv(loan_status);

-- Comment: Refresh this view hourly using:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY loan_summary_mv;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC AUDIT TRAIL
-- ============================================================================

-- Function: update_timestamp
-- Purpose: Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to all tables with audit fields
CREATE TRIGGER trigger_organizations_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_customers_timestamp
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_loans_timestamp
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_payments_timestamp
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_documents_timestamp
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Function: audit_log_insert
-- Purpose: Create audit log entry on INSERT
CREATE OR REPLACE FUNCTION audit_log_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        new_values,
        request_id
    )
    VALUES (
        'CREATE',
        TG_TABLE_NAME,
        NEW.id,
        NEW.created_by,
        row_to_json(NEW),
        current_setting('app.request_id', true)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: audit_log_update
-- Purpose: Create audit log entry on UPDATE
CREATE OR REPLACE FUNCTION audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        old_values,
        new_values,
        changed_fields,
        request_id
    )
    VALUES (
        'UPDATE',
        TG_TABLE_NAME,
        NEW.id,
        NEW.updated_by,
        row_to_json(OLD),
        row_to_json(NEW),
        ARRAY(
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = TG_TABLE_NAME
            AND (
                (OLD).column_name IS DISTINCT FROM (NEW).column_name
            )
        ),
        current_setting('app.request_id', true)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: audit_log_delete
-- Purpose: Create audit log entry on DELETE
CREATE OR REPLACE FUNCTION audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        old_values,
        request_id
    )
    VALUES (
        'DELETE',
        TG_TABLE_NAME,
        OLD.id,
        current_setting('app.user_id', true),
        row_to_json(OLD),
        current_setting('app.request_id', true)
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER trigger_loans_audit_insert
    AFTER INSERT ON loans
    FOR EACH ROW EXECUTE FUNCTION audit_log_insert();

CREATE TRIGGER trigger_loans_audit_update
    AFTER UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION audit_log_update();

CREATE TRIGGER trigger_loans_audit_delete
    AFTER DELETE ON loans
    FOR EACH ROW EXECUTE FUNCTION audit_log_delete();

-- ============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Officers can only view customers in their organization
CREATE POLICY customer_organization_access
    ON customers
    FOR SELECT
    USING (
        organization_id = current_setting('app.organization_id')::UUID
        OR current_setting('app.role') = 'SUPER_ADMIN'
    );

-- Policy: Officers can only view loans they manage or in their organization
CREATE POLICY loan_organization_access
    ON loans
    FOR SELECT
    USING (
        organization_id = current_setting('app.organization_id')::UUID
        OR officer_id = current_setting('app.user_id')::UUID
        OR current_setting('app.role') = 'SUPER_ADMIN'
    );

-- Policy: Officers can only view payments for loans they manage
CREATE POLICY payment_organization_access
    ON payments
    FOR SELECT
    USING (
        loan_id IN (
            SELECT loan_id FROM loans
            WHERE organization_id = current_setting('app.organization_id')::UUID
            OR officer_id = current_setting('app.user_id')::UUID
        )
        OR current_setting('app.role') = 'SUPER_ADMIN'
    );

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================

-- Function: cleanup_old_sessions
-- Purpose: Remove expired sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions
    WHERE expires_at < CURRENT_TIMESTAMP
    AND is_valid = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function: archive_old_notifications
-- Purpose: Archive old notifications
CREATE OR REPLACE FUNCTION archive_old_notifications()
RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET archived = TRUE,
    archived_at = CURRENT_TIMESTAMP
    WHERE archived = FALSE
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
    AND read_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Create application user
-- (This should be done by the deployment team)
-- CREATE USER sme_bank_app WITH PASSWORD 'secure_password_here';
-- GRANT CONNECT ON DATABASE sme_bank_2026 TO sme_bank_app;
-- GRANT USAGE ON SCHEMA public TO sme_bank_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sme_bank_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sme_bank_app;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

/*
MIGRATION STRATEGY FROM OLD SCHEMA:

1. DATA MAPPING:
   - branches → organizations
   - users → users (with encrypted fields)
   - customers → customers (with proper normalization)
   - loans → loans (with proper constraints)
   - payment_schedules → payment_schedules
   - payments → payments
   - transactions → transactions
   - documents → documents
   - contact_logs → contact_logs
   - next_payment_invoices → (merged into payment_schedules and payments)

2. DATA CLEANUP REQUIRED:
   - Remove orphan records
   - Fix DECIMAL precision (15,2 → 19,4)
   - Extract JSON fields to proper columns
   - Add missing audit trails
   - Implement soft delete
   - Encrypt sensitive fields

3. MIGRATION STEPS:
   a. Create new schema in parallel
   b. Migrate master data (organizations, users, customers)
   c. Migrate transactional data (loans, payments, schedules)
   d. Migrate supporting data (documents, contacts)
   e. Validate data integrity
   f. Switch application to new schema
   g. Archive old schema

4. VALIDATION CHECKS:
   - All monetary fields use DECIMAL(19,4)
   - All audit trails are complete
   - All FK constraints are enforced
   - All sensitive data is encrypted
   - All RLS policies are active
   - All indexes are created
   - All triggers are functional

5. PERFORMANCE OPTIMIZATION:
   - Partition large tables (transactions, audit_logs)
   - Create materialized views for reporting
   - Implement connection pooling
   - Configure query caching
   - Set up monitoring and alerting

6. SECURITY HARDENING:
   - Enable SSL/TLS for database connections
   - Implement password rotation
   - Set up audit log monitoring
   - Configure intrusion detection
   - Enable database activity monitoring
*/

-- ============================================================================
-- SCHEMA VERSION CONTROL
-- ============================================================================

-- Record schema version
INSERT INTO system_configs (config_key, config_value, config_category, config_description, data_type, created_by)
VALUES (
    'database.schema_version',
    '2.0.0',
    'DATABASE',
    'Database schema version',
    'STRING',
    gen_random_uuid()
);

INSERT INTO system_configs (config_key, config_value, config_category, config_description, data_type, created_by)
VALUES (
    'database.schema_name',
    'SME_BANK_2026_ENTERPRISE',
    'DATABASE',
    'Database schema name',
    'STRING',
    gen_random_uuid()
);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
