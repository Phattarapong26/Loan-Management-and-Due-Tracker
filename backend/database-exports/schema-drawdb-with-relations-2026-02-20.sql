-- SME D Bank Complete Database Schema with Relations for DrawDB
-- Generated: 2026-02-20
-- Total Tables: 72
-- Total Relations: 119

-- Branch
CREATE TABLE branches (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    aging_analysis TEXT NOT NULL,
    budget_consumption TEXT NOT NULL
);

-- User
CREATE TABLE users (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255),
    avatar VARCHAR(255),
    branch_id VARCHAR(255),
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    password_changed_at TIMESTAMP,
    national_id VARCHAR(255),
    line_user_id VARCHAR(255) UNIQUE,
    line_linked_at TIMESTAMP,
    line_active BOOLEAN NOT NULL DEFAULT true,
    line_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    monthly_target DECIMAL(15,2) DEFAULT 100000.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP,
    aging_analysis TEXT NOT NULL,
    aml_checks_aml_checks_performed_byTousers TEXT NOT NULL,
    aml_checks_aml_checks_reviewed_byTousers TEXT NOT NULL,
    budget_consumption_budget_consumption_processed_byTousers TEXT NOT NULL,
    budget_consumption_budget_consumption_released_byTousers TEXT NOT NULL,
    collection_workflow_steps TEXT NOT NULL,
    credit_line_drawdowns TEXT NOT NULL,
    credit_lines TEXT NOT NULL,
    data_access_logs TEXT NOT NULL,
    loan_approval_workflow TEXT NOT NULL,
    principal_prepayments TEXT NOT NULL,
    product_budgets_product_budgets_budget_ownerTousers TEXT NOT NULL,
    product_budgets_product_budgets_created_byTousers TEXT NOT NULL,
    suspicious_transaction_reports TEXT NOT NULL,
    task_assignments_task_assignments_assigned_byTousers TEXT NOT NULL,
    task_assignments_task_assignments_assigned_toTousers TEXT NOT NULL
);

-- ApprovalLimit
CREATE TABLE approval_limits (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    min_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    max_amount DECIMAL(15,2),
    approval_level VARCHAR(255) NOT NULL,
    requires_next_level BOOLEAN NOT NULL DEFAULT false,
    sla_hours INTEGER NOT NULL DEFAULT 24,
    "status" VARCHAR(255) NOT NULL DEFAULT '"ACTIVE"',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- Session
CREATE TABLE sessions (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    previous_token VARCHAR(255),
    previous_token_expires_at TIMESTAMP,
    previous_refresh_token VARCHAR(255),
    ip_address VARCHAR(255),
    user_agent VARCHAR(255),
    is_valid BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transaction
CREATE TABLE transactions (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    loan_id VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(255) NOT NULL DEFAULT '"THB"',
    from_account VARCHAR(255),
    to_account VARCHAR(255),
    reference VARCHAR(255) UNIQUE,
    description VARCHAR(255),
    metadata TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    suspicious_transaction_reports TEXT NOT NULL
);

-- NextPaymentInvoice
CREATE TABLE next_payment_invoices (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    loan_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    payment_schedule_id VARCHAR(255) NOT NULL,
    invoice_data TEXT NOT NULL,
    generated_by VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP,
    sent_via VARCHAR(255),
    sent_by VARCHAR(255),
    paid_at TIMESTAMP,
    paid_amount DECIMAL(15,2),
    payment_method VARCHAR(255),
    receipt_number VARCHAR(255),
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- PaymentReceipt
CREATE TABLE payment_receipts (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    receipt_number VARCHAR(255) NOT NULL UNIQUE,
    payment_id VARCHAR(255) NOT NULL,
    loan_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    payment_method VARCHAR(255) NOT NULL,
    receipt_data TEXT NOT NULL,
    issued_by VARCHAR(255) NOT NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    sent_via VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- InterestRateTier
CREATE TABLE interest_rate_tiers (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_product_id VARCHAR(255),
    tier_name VARCHAR(255) NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    interest_rate DECIMAL(15,2) NOT NULL,
    grace_period_days INTEGER NOT NULL DEFAULT 0,
    effective_from TIMESTAMP NOT NULL,
    effective_until TIMESTAMP,
    "status" VARCHAR(255) NOT NULL DEFAULT '"ACTIVE"',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- YearInterestTier
CREATE TABLE year_interest_tiers (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_product_id VARCHAR(255) NOT NULL,
    tier_type VARCHAR(255) NOT NULL,
    start_year INTEGER NOT NULL,
    end_year VARCHAR(255) NOT NULL,
    rate DECIMAL(15,2),
    formula VARCHAR(255),
    min_rate DECIMAL(15,2),
    max_rate DECIMAL(15,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- LoanInterestHistory
CREATE TABLE loan_interest_history (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    payment_number INTEGER NOT NULL,
    outstanding_balance DECIMAL(15,2) NOT NULL,
    applied_rate DECIMAL(15,2) NOT NULL,
    tier_name VARCHAR(255),
    grace_period_days INTEGER NOT NULL DEFAULT 0,
    interest_amount DECIMAL(15,2) NOT NULL,
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_date TIMESTAMP NOT NULL
);

-- AuditLog
CREATE TABLE audit_logs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(255) NOT NULL,
    entity_id VARCHAR(255),
    changes TEXT,
    ip_address VARCHAR(255),
    user_agent VARCHAR(255),
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer
CREATE TABLE customers (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255),
    branch_id VARCHAR(255) NOT NULL,
    customer_code VARCHAR(255) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(255),
    business_registration_date TIMESTAMP,
    business_registration_type VARCHAR(255),
    registered_capital DECIMAL(15,2),
    business_size VARCHAR(255),
    industry_code VARCHAR(255),
    business_age_years INTEGER,
    number_of_employees INTEGER,
    phone VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address VARCHAR(255),
    business_address VARCHAR(255),
    business_phone VARCHAR(255),
    thai_id VARCHAR(255),
    tax_id VARCHAR(255) NOT NULL UNIQUE,
    avatar VARCHAR(255),
    shareholders TEXT,
    signatories TEXT,
    annual_revenue DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    total_assets DECIMAL(15,2),
    total_liabilities DECIMAL(15,2),
    debt_to_equity_ratio DECIMAL(15,2),
    ai_extracted_data TEXT,
    ai_confidence_score DECIMAL(15,2),
    ai_processed_at TIMESTAMP,
    ai_warnings VARCHAR(255) NOT NULL DEFAULT '[]',
    document_complete BOOLEAN NOT NULL DEFAULT false,
    line_user_id VARCHAR(255) UNIQUE,
    line_linked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    aging_analysis TEXT NOT NULL,
    aml_checks TEXT NOT NULL,
    credit_lines TEXT NOT NULL,
    data_access_logs TEXT NOT NULL,
    privacy_consents TEXT NOT NULL,
    suspicious_transaction_reports TEXT NOT NULL
);

-- Loan
CREATE TABLE loans (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    branch_id VARCHAR(255) NOT NULL,
    officer_id VARCHAR(255) NOT NULL,
    contract_number VARCHAR(255) UNIQUE,
    principal DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(15,2) NOT NULL,
    term_months INTEGER NOT NULL,
    current_principal DECIMAL(15,2),
    version INTEGER NOT NULL DEFAULT 1,
    interest_calculation_method VARCHAR(255) DEFAULT '"DYNAMIC_PRINCIPAL"',
    last_interest_calculation_date TIMESTAMP,
    accumulated_interest DECIMAL(15,2) DEFAULT 0,
    payment_day INTEGER NOT NULL DEFAULT 1,
    first_payment_date TIMESTAMP,
    payment_day_adjustment VARCHAR(255) DEFAULT '"LAST_DAY"',
    dscr DECIMAL(15,2),
    dscr_status VARCHAR(255),
    monthly_payment DECIMAL(15,2),
    total_interest DECIMAL(15,2),
    allow_early_payment BOOLEAN DEFAULT true,
    early_payment_penalty_rate DECIMAL(15,2) DEFAULT 0,
    sla_status VARCHAR(255),
    sla_deadline TIMESTAMP,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejected_reason VARCHAR(255),
    approval_history TEXT,
    disbursement_date TIMESTAMP,
    maturity_date TIMESTAMP,
    outstanding_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    next_payment_date TIMESTAMP,
    next_payment_amount DECIMAL(15,2),
    last_payment_date TIMESTAMP,
    overdue_days INTEGER NOT NULL DEFAULT 0,
    total_disbursed DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(15,2),
    product_config_id VARCHAR(255),
    product_config TEXT,
    loan_product_id VARCHAR(255),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    aging_analysis TEXT,
    budget_consumption TEXT NOT NULL,
    loan_approval_workflow TEXT NOT NULL,
    principal_prepayments TEXT NOT NULL
);

-- PaymentSchedule
CREATE TABLE payment_schedules (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    payment_number INTEGER NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    total_payment DECIMAL(15,2) NOT NULL,
    remaining_balance DECIMAL(15,2) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    paid_at TIMESTAMP,
    statement_number VARCHAR(255),
    days_overdue INTEGER NOT NULL DEFAULT 0,
    penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    compound_interest_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    principal_prepayments TEXT NOT NULL
);

-- Payment
CREATE TABLE payments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    payment_schedule_id VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    payment_method VARCHAR(255) NOT NULL,
    interest_saved DECIMAL(15,2),
    penalty_amount DECIMAL(15,2),
    notes VARCHAR(255),
    reference VARCHAR(255) UNIQUE,
    idempotency_key VARCHAR(255) UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    processed_at TIMESTAMP,
    payment_gateway VARCHAR(255),
    gateway_reference VARCHAR(255),
    gateway_response TEXT,
    bank_name VARCHAR(255),
    account_number VARCHAR(255),
    verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL
);

-- Document
CREATE TABLE documents (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255),
    document_type VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    ai_processed BOOLEAN NOT NULL DEFAULT false,
    ai_status VARCHAR(255),
    extracted_data TEXT,
    confidence_score DECIMAL(15,2),
    enhanced_data TEXT,
    document_subtype VARCHAR(255),
    processing_version VARCHAR(255) DEFAULT '"v1"',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    review_notes VARCHAR(255),
    rejected_reason VARCHAR(255),
    uploaded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- ContactLog
CREATE TABLE contact_logs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    loan_id VARCHAR(255),
    officer_id VARCHAR(255) NOT NULL,
    contact_date TIMESTAMP NOT NULL,
    notes VARCHAR(255) NOT NULL,
    promised_date TIMESTAMP,
    task_id VARCHAR(255),
    next_follow_up_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ProductConfig
CREATE TABLE product_configs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    product_code VARCHAR(255) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    config TEXT NOT NULL,
    active_from TIMESTAMP NOT NULL,
    active_until TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- LoanProduct
CREATE TABLE loan_products (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    product_code VARCHAR(255) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    product_name_en VARCHAR(255),
    description VARCHAR(255),
    purpose VARCHAR(255) NOT NULL DEFAULT '[]',
    eligibility VARCHAR(255) NOT NULL DEFAULT '[]',
    target_business VARCHAR(255) NOT NULL DEFAULT '[]',
    min_revenue DECIMAL(15,2),
    max_revenue DECIMAL(15,2),
    min_years_in_business INTEGER,
    min_loan_amount DECIMAL(15,2),
    max_loan_amount DECIMAL(15,2) NOT NULL,
    total_project_budget DECIMAL(15,2),
    interest_rate_year_1_3 DECIMAL(15,2),
    interest_rate_year_4_plus DECIMAL(15,2),
    interest_rate_formula VARCHAR(255),
    government_subsidy BOOLEAN NOT NULL DEFAULT false,
    subsidy_details VARCHAR(255),
    max_term_months INTEGER NOT NULL,
    grace_period_months INTEGER DEFAULT 0,
    collateral_required BOOLEAN NOT NULL DEFAULT true,
    collateral_details VARCHAR(255),
    guarantee_options VARCHAR(255) NOT NULL DEFAULT '[]',
    benefits VARCHAR(255) NOT NULL DEFAULT '[]',
    fee_waivers VARCHAR(255) NOT NULL DEFAULT '[]',
    project_start_date TIMESTAMP,
    project_end_date TIMESTAMP,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    product_budgets TEXT NOT NULL
);

-- PenaltyRule
CREATE TABLE penalty_rules (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_product_id VARCHAR(255),
    rule_name VARCHAR(255) NOT NULL,
    days_overdue_from INTEGER NOT NULL DEFAULT 1,
    days_overdue_to INTEGER,
    penalty_type VARCHAR(255) NOT NULL,
    penalty_rate DECIMAL(15,2),
    penalty_amount DECIMAL(15,2),
    compound_interest BOOLEAN NOT NULL DEFAULT false,
    compound_rate DECIMAL(15,2),
    is_default BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(255) NOT NULL DEFAULT '"ACTIVE"',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerActiveProduct
CREATE TABLE customer_active_products (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    loan_product_id VARCHAR(255) NOT NULL,
    loan_id VARCHAR(255) NOT NULL,
    activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP,
    "status" VARCHAR(255) NOT NULL DEFAULT '"ACTIVE"'
);

-- SystemConfig
CREATE TABLE system_configs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    "key" VARCHAR(255) NOT NULL UNIQUE,
    "value" VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- Expense
CREATE TABLE expenses (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    branch_id VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    receipt_path VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejected_reason VARCHAR(255),
    reimbursed BOOLEAN NOT NULL DEFAULT false,
    reimbursed_at TIMESTAMP,
    reimbursed_by VARCHAR(255),
    expense_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- LoanDisbursement
CREATE TABLE loan_disbursements (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    disbursement_no INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    requested_date TIMESTAMP NOT NULL,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejected_reason VARCHAR(255),
    disbursed_by VARCHAR(255),
    disbursed_at TIMESTAMP,
    disbursement_method VARCHAR(255),
    reference_no VARCHAR(255),
    next_disbursement_date TIMESTAMP,
    notes VARCHAR(255),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- Notification
CREATE TABLE notifications (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(255) NOT NULL,
    link VARCHAR(255),
    metadata TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP,
    priority VARCHAR(255) NOT NULL DEFAULT '"MEDIUM"',
    event_id VARCHAR(255),
    dedup_key VARCHAR(255),
    archived BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMP,
    audience_roles VARCHAR(255) NOT NULL DEFAULT '[]',
    action_id VARCHAR(255),
    action_label VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- NotificationAudienceRule
CREATE TABLE notification_audience_rules (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    notification_type VARCHAR(255) NOT NULL UNIQUE,
    allowed_roles VARCHAR(255) NOT NULL,
    allowed_branches VARCHAR(255) NOT NULL DEFAULT '["all"]',
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- NotificationAction
CREATE TABLE notification_actions (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    notification_type VARCHAR(255) NOT NULL,
    action_id VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    link VARCHAR(255) NOT NULL,
    required_roles VARCHAR(255) NOT NULL,
    required_permissions VARCHAR(255) NOT NULL DEFAULT '[]',
    requires_confirmation BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CalendarEvent
CREATE TABLE calendar_events (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    branch_id VARCHAR(255),
    created_by VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    all_day BOOLEAN NOT NULL DEFAULT false,
    loan_id VARCHAR(255),
    customer_id VARCHAR(255),
    recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule VARCHAR(255),
    reminder_minutes INTEGER NOT NULL DEFAULT '[]',
    location VARCHAR(255),
    attendees VARCHAR(255) NOT NULL DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- ConversationState
CREATE TABLE conversation_states (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    line_user_id VARCHAR(255) NOT NULL UNIQUE,
    flow VARCHAR(255) NOT NULL,
    step VARCHAR(255) NOT NULL,
    data TEXT,
    state VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- RegistrationToken
CREATE TABLE registration_tokens (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    line_user_id VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PromptPayQRCode
CREATE TABLE promptpay_qr_codes (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    payment_ref VARCHAR(255) NOT NULL UNIQUE,
    amount_expected DECIMAL(15,2) NOT NULL,
    qr_code_data VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invoice
CREATE TABLE invoices (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    payment_schedule_id VARCHAR(255) NOT NULL,
    loan_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    invoice_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    invoice_data TEXT NOT NULL,
    sent_at TIMESTAMP,
    sent_via VARCHAR(255),
    viewed_at TIMESTAMP,
    generated_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- InvoiceAccessLog
CREATE TABLE invoice_access_logs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(255),
    user_agent VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- aging_analysis
CREATE TABLE aging_analysis (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL UNIQUE,
    customer_id VARCHAR(255) NOT NULL,
    branch_id VARCHAR(255) NOT NULL,
    current_age INTEGER NOT NULL DEFAULT 0,
    aging_bucket VARCHAR(255) NOT NULL,
    principal_overdue DECIMAL(15,2) DEFAULT 0,
    interest_overdue DECIMAL(15,2) DEFAULT 0,
    penalty_overdue DECIMAL(15,2) DEFAULT 0,
    total_overdue DECIMAL(15,2) DEFAULT 0,
    collection_agent_id VARCHAR(255),
    collection_strategy VARCHAR(255),
    next_action_date TIMESTAMP,
    "status" VARCHAR(255) DEFAULT '"ACTIVE"',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- aml_checks
CREATE TABLE aml_checks (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    check_type VARCHAR(255) NOT NULL,
    check_result VARCHAR(255) NOT NULL,
    match_score DECIMAL(15,2),
    matched_names TEXT,
    check_data TEXT,
    performed_by VARCHAR(255),
    performed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- budget_consumption
CREATE TABLE budget_consumption (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    product_budget_id VARCHAR(255) NOT NULL,
    loan_id VARCHAR(255) NOT NULL,
    branch_id VARCHAR(255) NOT NULL,
    requested_amount DECIMAL(15,2) NOT NULL,
    approved_amount DECIMAL(15,2) NOT NULL,
    disbursed_amount DECIMAL(15,2) DEFAULT 0,
    consumption_type VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) DEFAULT '"ACTIVE"',
    consumption_date TIMESTAMP NOT NULL,
    consumption_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_by VARCHAR(255),
    released_amount DECIMAL(15,2) DEFAULT 0,
    released_at TIMESTAMP,
    released_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    product_budgets TEXT NOT NULL
);

-- collection_workflow_steps
CREATE TABLE collection_workflow_steps (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    days_overdue_from INTEGER NOT NULL,
    days_overdue_to INTEGER,
    action_type VARCHAR(255) NOT NULL,
    template_id VARCHAR(255),
    priority VARCHAR(255) NOT NULL,
    assigned_role VARCHAR(255) NOT NULL,
    sla_hours INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- credit_line_drawdowns
CREATE TABLE credit_line_drawdowns (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    credit_line_id VARCHAR(255) NOT NULL,
    drawdown_number VARCHAR(255) NOT NULL UNIQUE,
    amount DECIMAL(15,2) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    drawdown_date TIMESTAMP NOT NULL,
    maturity_date TIMESTAMP NOT NULL,
    interest_rate DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(255) DEFAULT '"ACTIVE"',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    credit_lines TEXT NOT NULL
);

-- credit_lines
CREATE TABLE credit_lines (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    credit_line_number VARCHAR(255) NOT NULL UNIQUE,
    approved_limit DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2) DEFAULT 0,
    utilization_rate DECIMAL(15,2) DEFAULT 0,
    interest_rate DECIMAL(15,2) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    review_date TIMESTAMP,
    "status" VARCHAR(255) DEFAULT '"ACTIVE"',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    credit_line_drawdowns TEXT NOT NULL
);

-- data_access_logs
CREATE TABLE data_access_logs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    access_type VARCHAR(255) NOT NULL,
    access_path VARCHAR(255) NOT NULL,
    accessed_fields VARCHAR(255) NOT NULL,
    purpose VARCHAR(255),
    ip_address VARCHAR(255),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- loan_approval_workflow
CREATE TABLE loan_approval_workflow (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    approval_level INTEGER NOT NULL DEFAULT 1,
    approver_id VARCHAR(255),
    approval_status VARCHAR(255) DEFAULT '"PENDING"',
    approved_amount DECIMAL(15,2),
    approval_notes VARCHAR(255),
    sla_deadline TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- principal_prepayments
CREATE TABLE principal_prepayments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    payment_schedule_id VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    prepayment_date TIMESTAMP NOT NULL,
    interest_saved DECIMAL(15,2) DEFAULT 0,
    new_monthly_payment DECIMAL(15,2),
    new_maturity_date TIMESTAMP,
    penalty_amount DECIMAL(15,2) DEFAULT 0,
    processed_by VARCHAR(255),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- privacy_consents
CREATE TABLE privacy_consents (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    consent_type VARCHAR(255) NOT NULL,
    consent_version VARCHAR(255) NOT NULL,
    consent_text VARCHAR(255) NOT NULL,
    given BOOLEAN NOT NULL DEFAULT false,
    given_at TIMESTAMP,
    withdrawn BOOLEAN DEFAULT false,
    withdrawn_at TIMESTAMP,
    ip_address VARCHAR(255),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- product_budgets
CREATE TABLE product_budgets (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL,
    product_code VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    quarter INTEGER,
    total_budget_amount DECIMAL(15,2) NOT NULL,
    committed_amount DECIMAL(15,2) DEFAULT 0,
    disbursed_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2) DEFAULT 0,
    available_amount DECIMAL(15,2) DEFAULT 0,
    utilization_rate DECIMAL(15,2) DEFAULT 0,
    warning_threshold DECIMAL(15,2) DEFAULT 80.00,
    critical_threshold DECIMAL(15,2) DEFAULT 95.00,
    budget_status VARCHAR(255) DEFAULT '"ACTIVE"',
    budget_owner VARCHAR(255),
    notes VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    budget_consumption TEXT NOT NULL
);

-- suspicious_transaction_reports
CREATE TABLE suspicious_transaction_reports (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    report_number VARCHAR(255) NOT NULL UNIQUE,
    customer_id VARCHAR(255),
    transaction_id VARCHAR(255),
    suspicion_type VARCHAR(255) NOT NULL,
    suspicion_details VARCHAR(255) NOT NULL,
    reported_by VARCHAR(255) NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_status VARCHAR(255) DEFAULT '"PENDING"',
    submitted_to VARCHAR(255),
    submitted_at TIMESTAMP,
    amlo_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- task_assignments
CREATE TABLE task_assignments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255) NOT NULL,
    assigned_by VARCHAR(255) NOT NULL,
    priority VARCHAR(255) NOT NULL DEFAULT '"MEDIUM"',
    due_date TIMESTAMP NOT NULL,
    completion_date TIMESTAMP,
    "status" VARCHAR(255) DEFAULT '"PENDING"',
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- PaymentTimelineEvent
CREATE TABLE payment_timeline_events (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    loan_id VARCHAR(255) NOT NULL,
    payment_schedule_id VARCHAR(255) NOT NULL,
    scheduled_date TIMESTAMP NOT NULL,
    executed_at TIMESTAMP,
    metadata TEXT,
    error_message VARCHAR(255),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- thai_banks
CREATE TABLE thai_banks (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    bank_code VARCHAR(255) NOT NULL UNIQUE,
    bank_name VARCHAR(255) NOT NULL,
    bank_name_th VARCHAR(255) NOT NULL,
    bank_name_en VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    color_code VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SecurityEvent
CREATE TABLE security_events (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255),
    ip_address VARCHAR(255) NOT NULL,
    user_agent VARCHAR(255),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(255) NOT NULL,
    threat_type VARCHAR(255) NOT NULL,
    severity VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    payload VARCHAR(255),
    blocked BOOLEAN NOT NULL DEFAULT false,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SecurityAlert
CREATE TABLE security_alerts (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    "type" VARCHAR(255) NOT NULL,
    severity VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    ip_address VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    endpoint VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) NOT NULL DEFAULT '"OPEN"',
    resolved_at TIMESTAMP,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- BlockedIP
CREATE TABLE blocked_ips (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    ip_address VARCHAR(255) NOT NULL UNIQUE,
    reason VARCHAR(255) NOT NULL,
    blocked_by VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerVATRecord
CREATE TABLE customer_vat_records (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    month VARCHAR(255) NOT NULL,
    year INTEGER,
    sales_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    sales_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
    purchase_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    purchase_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_payable DECIMAL(15,2) NOT NULL DEFAULT 0,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerInvestment
CREATE TABLE customer_investments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    own_share DECIMAL(15,2) NOT NULL DEFAULT 0,
    loan_share DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerFinancialStatement
CREATE TABLE customer_financial_statements (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    year VARCHAR(255) NOT NULL,
    revenue DECIMAL(15,2),
    gross_profit DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    cost_of_sales DECIMAL(15,2),
    selling_expenses DECIMAL(15,2),
    admin_expenses DECIMAL(15,2),
    ebitda DECIMAL(15,2),
    total_assets DECIMAL(15,2),
    total_liabilities DECIMAL(15,2),
    total_equity DECIMAL(15,2),
    current_assets DECIMAL(15,2),
    non_current_assets DECIMAL(15,2),
    current_liabilities DECIMAL(15,2),
    non_current_liabilities DECIMAL(15,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerWorkingCapital
CREATE TABLE customer_working_capitals (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    total_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
    used_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
    stock_amount DECIMAL(15,2),
    receivable_days INTEGER,
    payable_days INTEGER,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerProjection
CREATE TABLE customer_projections (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    year VARCHAR(255) NOT NULL,
    revenue DECIMAL(15,2),
    cost_of_sales DECIMAL(15,2),
    gross_profit DECIMAL(15,2),
    expenses DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    dscr DECIMAL(15,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerCreditBureau
CREATE TABLE customer_credit_bureaus (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    check_date TIMESTAMP,
    total_limit DECIMAL(15,2),
    total_outstanding DECIMAL(15,2),
    number_of_accounts INTEGER,
    npl_status BOOLEAN NOT NULL DEFAULT false,
    accounts TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerBankStatement
CREATE TABLE customer_bank_statements (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(255),
    account_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
);

-- CustomerBankStatementMonth
CREATE TABLE customer_bank_statement_months (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    statement_id VARCHAR(255) NOT NULL,
    month VARCHAR(255) NOT NULL,
    withdraw_count INTEGER NOT NULL DEFAULT 0,
    withdraw_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    deposit_count INTEGER NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0
);

-- CustomerComment
CREATE TABLE customer_comments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    topic VARCHAR(255),
    content VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerBusinessHistory
CREATE TABLE customer_business_histories (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    content VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SecureDocumentToken
CREATE TABLE secure_document_tokens (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    document_type VARCHAR(255) NOT NULL,
    document_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DocumentAccessLog
CREATE TABLE document_access_logs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    reason VARCHAR(255),
    accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerBusinessProfile
CREATE TABLE customer_business_profiles (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    source_file_name VARCHAR(255) NOT NULL,
    source_file_hash VARCHAR(255),
    document_id VARCHAR(255),
    parser_version VARCHAR(255) NOT NULL DEFAULT '"v3.0"',
    match_confidence DECIMAL(15,2) NOT NULL,
    sheets_parsed VARCHAR(255) NOT NULL,
    warnings VARCHAR(255) NOT NULL DEFAULT '[]',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    review_notes VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    is_latest BOOLEAN NOT NULL DEFAULT true,
    previous_version_id VARCHAR(255),
    enhanced_data TEXT,
    recommendation VARCHAR(255),
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

-- CustomerShareholder
CREATE TABLE customer_shareholders (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    national_id VARCHAR(255),
    share_percentage DECIMAL(15,2) NOT NULL,
    share_value DECIMAL(15,2) NOT NULL,
    share_type VARCHAR(255) DEFAULT '"ORDINARY"',
    has_signing_authority BOOLEAN NOT NULL DEFAULT false,
    signing_conditions VARCHAR(255),
    position VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    address VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerExecutive
CREATE TABLE customer_executives (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    national_id VARCHAR(255),
    date_of_birth TIMESTAMP,
    age INTEGER,
    marital_status VARCHAR(255),
    current_address VARCHAR(255),
    registered_address VARCHAR(255),
    education VARCHAR(255),
    experience VARCHAR(255),
    is_shareholder BOOLEAN NOT NULL DEFAULT false,
    share_percentage DECIMAL(15,2),
    share_value DECIMAL(15,2),
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerLoanRequest
CREATE TABLE customer_loan_requests (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    loan_type VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    requested_amount DECIMAL(15,2) NOT NULL,
    purpose VARCHAR(255),
    term_months INTEGER,
    proposed_interest_rate VARCHAR(255),
    interest_calculation VARCHAR(255),
    collateral_description VARCHAR(255),
    collateral_value DECIMAL(15,2),
    request_type VARCHAR(255) NOT NULL DEFAULT '"NEW"',
    "status" VARCHAR(255) NOT NULL DEFAULT '"PENDING"',
    loan_id VARCHAR(255) UNIQUE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerCollateral
CREATE TABLE customer_collaterals (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    collateral_type VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    estimated_value DECIMAL(15,2) NOT NULL,
    appraised_value DECIMAL(15,2),
    appraised_by VARCHAR(255),
    appraised_date TIMESTAMP,
    owner_name VARCHAR(255),
    owner_relationship VARCHAR(255),
    title_deed_number VARCHAR(255),
    land_office VARCHAR(255),
    registration_number VARCHAR(255),
    is_insured BOOLEAN NOT NULL DEFAULT false,
    insurance_company VARCHAR(255),
    insurance_value DECIMAL(15,2),
    "order" INTEGER NOT NULL DEFAULT 0,
    attachments TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerSupplier
CREATE TABLE customer_suppliers (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(255),
    contact_person VARCHAR(255),
    product_type VARCHAR(255),
    payment_terms VARCHAR(255),
    credit_limit DECIMAL(15,2),
    contact_duration VARCHAR(255),
    relationship_quality VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerCustomer
CREATE TABLE customer_customers (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(255),
    contact_person VARCHAR(255),
    product_service VARCHAR(255),
    payment_terms VARCHAR(255),
    sales_proportion DECIMAL(15,2),
    contact_duration VARCHAR(255),
    relationship_quality VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerDSCRAnalysis
CREATE TABLE customer_dscr_analysis (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    analysis_year INTEGER NOT NULL,
    analysis_period VARCHAR(255),
    net_operating_income DECIMAL(15,2) NOT NULL,
    other_income DECIMAL(15,2),
    total_income DECIMAL(15,2) NOT NULL,
    principal_payment DECIMAL(15,2) NOT NULL,
    interest_payment DECIMAL(15,2) NOT NULL,
    total_debt_service DECIMAL(15,2) NOT NULL,
    dscr_ratio DECIMAL(15,2) NOT NULL,
    dscr_status VARCHAR(255) NOT NULL,
    breakdown TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CustomerApprovalComment
CREATE TABLE customer_approval_comments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    comment_type VARCHAR(255) NOT NULL,
    comment_by VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    comments VARCHAR(255) NOT NULL,
    risk_assessment VARCHAR(255),
    recommendation VARCHAR(255),
    decision VARCHAR(255),
    approved_amount DECIMAL(15,2),
    special_conditions VARCHAR(255),
    comment_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign Key Constraints
-- Total Relations: 119

-- Relations from user
ALTER TABLE "user" ADD FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Relations from session
ALTER TABLE "session" ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from transaction
ALTER TABLE "transaction" ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE "transaction" ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from nextpaymentinvoice
ALTER TABLE nextpaymentinvoice ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE nextpaymentinvoice ADD FOREIGN KEY (generated_by) REFERENCES users(id);
ALTER TABLE nextpaymentinvoice ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE nextpaymentinvoice ADD FOREIGN KEY (payment_schedule_id) REFERENCES payment_schedules(id);
ALTER TABLE nextpaymentinvoice ADD FOREIGN KEY (sent_by) REFERENCES users(id);

-- Relations from paymentreceipt
ALTER TABLE paymentreceipt ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE paymentreceipt ADD FOREIGN KEY (invoice_id) REFERENCES next_payment_invoices(id);
ALTER TABLE paymentreceipt ADD FOREIGN KEY (issued_by) REFERENCES users(id);
ALTER TABLE paymentreceipt ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE paymentreceipt ADD FOREIGN KEY (payment_id) REFERENCES payments(id);

-- Relations from interestratetier
ALTER TABLE interestratetier ADD FOREIGN KEY (loan_product_id) REFERENCES loan_products(id);

-- Relations from yearinteresttier
ALTER TABLE yearinteresttier ADD FOREIGN KEY (loan_product_id) REFERENCES loan_products(id);

-- Relations from loaninteresthistory
ALTER TABLE loaninteresthistory ADD FOREIGN KEY (loan_id) REFERENCES loans(id);

-- Relations from auditlog
ALTER TABLE auditlog ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from customer
ALTER TABLE customer ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE customer ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from loan
ALTER TABLE loan ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE loan ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE loan ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE loan ADD FOREIGN KEY (loan_product_id) REFERENCES loan_products(id);
ALTER TABLE loan ADD FOREIGN KEY (officer_id) REFERENCES users(id);

-- Relations from paymentschedule
ALTER TABLE paymentschedule ADD FOREIGN KEY (loan_id) REFERENCES loans(id);

-- Relations from payment
ALTER TABLE payment ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE payment ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE payment ADD FOREIGN KEY (payment_schedule_id) REFERENCES payment_schedules(id);

-- Relations from document
ALTER TABLE document ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from contactlog
ALTER TABLE contactlog ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE contactlog ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE contactlog ADD FOREIGN KEY (officer_id) REFERENCES users(id);

-- Relations from penaltyrule
ALTER TABLE penaltyrule ADD FOREIGN KEY (loan_product_id) REFERENCES loan_products(id);

-- Relations from customeractiveproduct
ALTER TABLE customeractiveproduct ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customeractiveproduct ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE customeractiveproduct ADD FOREIGN KEY (loan_product_id) REFERENCES loan_products(id);

-- Relations from systemconfig
ALTER TABLE systemconfig ADD FOREIGN KEY (updated_by) REFERENCES users(id);

-- Relations from expense
ALTER TABLE expense ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE expense ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE expense ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE expense ADD FOREIGN KEY (reimbursed_by) REFERENCES users(id);
ALTER TABLE expense ADD FOREIGN KEY (rejected_by) REFERENCES users(id);

-- Relations from loandisbursement
ALTER TABLE loandisbursement ADD FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE loandisbursement ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE loandisbursement ADD FOREIGN KEY (disbursed_by) REFERENCES users(id);
ALTER TABLE loandisbursement ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE loandisbursement ADD FOREIGN KEY (rejected_by) REFERENCES users(id);

-- Relations from notification
ALTER TABLE notification ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from calendarevent
ALTER TABLE calendarevent ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE calendarevent ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE calendarevent ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE calendarevent ADD FOREIGN KEY (loan_id) REFERENCES loans(id);

-- Relations from invoice
ALTER TABLE invoice ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE invoice ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE invoice ADD FOREIGN KEY (payment_schedule_id) REFERENCES payment_schedules(id);

-- Relations from invoiceaccesslog
ALTER TABLE invoiceaccesslog ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from aging_analysis
ALTER TABLE aging_analysis ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE aging_analysis ADD FOREIGN KEY (collection_agent_id) REFERENCES users(id);
ALTER TABLE aging_analysis ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE aging_analysis ADD FOREIGN KEY (loan_id) REFERENCES loans(id);

-- Relations from aml_checks
ALTER TABLE aml_checks ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE aml_checks ADD FOREIGN KEY (performed_by) REFERENCES users(id);
ALTER TABLE aml_checks ADD FOREIGN KEY (reviewed_by) REFERENCES users(id);

-- Relations from budget_consumption
ALTER TABLE budget_consumption ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE budget_consumption ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE budget_consumption ADD FOREIGN KEY (processed_by) REFERENCES users(id);
ALTER TABLE budget_consumption ADD FOREIGN KEY (product_budget_id) REFERENCES product_budgets(id);
ALTER TABLE budget_consumption ADD FOREIGN KEY (released_by) REFERENCES users(id);

-- Relations from collection_workflow_steps
ALTER TABLE collection_workflow_steps ADD FOREIGN KEY (created_by) REFERENCES users(id);

-- Relations from credit_line_drawdowns
ALTER TABLE credit_line_drawdowns ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE credit_line_drawdowns ADD FOREIGN KEY (credit_line_id) REFERENCES credit_lines(id);

-- Relations from credit_lines
ALTER TABLE credit_lines ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE credit_lines ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from data_access_logs
ALTER TABLE data_access_logs ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE data_access_logs ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from loan_approval_workflow
ALTER TABLE loan_approval_workflow ADD FOREIGN KEY (approver_id) REFERENCES users(id);
ALTER TABLE loan_approval_workflow ADD FOREIGN KEY (loan_id) REFERENCES loans(id);

-- Relations from principal_prepayments
ALTER TABLE principal_prepayments ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE principal_prepayments ADD FOREIGN KEY (payment_schedule_id) REFERENCES payment_schedules(id);
ALTER TABLE principal_prepayments ADD FOREIGN KEY (processed_by) REFERENCES users(id);

-- Relations from privacy_consents
ALTER TABLE privacy_consents ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from product_budgets
ALTER TABLE product_budgets ADD FOREIGN KEY (budget_owner) REFERENCES users(id);
ALTER TABLE product_budgets ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE product_budgets ADD FOREIGN KEY (product_id) REFERENCES loan_products(id);

-- Relations from suspicious_transaction_reports
ALTER TABLE suspicious_transaction_reports ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE suspicious_transaction_reports ADD FOREIGN KEY (reported_by) REFERENCES users(id);
ALTER TABLE suspicious_transaction_reports ADD FOREIGN KEY (transaction_id) REFERENCES transactions(id);

-- Relations from task_assignments
ALTER TABLE task_assignments ADD FOREIGN KEY (assigned_by) REFERENCES users(id);
ALTER TABLE task_assignments ADD FOREIGN KEY (assigned_to) REFERENCES users(id);

-- Relations from paymenttimelineevent
ALTER TABLE paymenttimelineevent ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE paymenttimelineevent ADD FOREIGN KEY (payment_schedule_id) REFERENCES payment_schedules(id);

-- Relations from securityevent
ALTER TABLE securityevent ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from securityalert
ALTER TABLE securityalert ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Relations from customervatrecord
ALTER TABLE customervatrecord ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customerinvestment
ALTER TABLE customerinvestment ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customerfinancialstatement
ALTER TABLE customerfinancialstatement ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customerworkingcapital
ALTER TABLE customerworkingcapital ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customerprojection
ALTER TABLE customerprojection ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customercreditbureau
ALTER TABLE customercreditbureau ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customerbankstatement
ALTER TABLE customerbankstatement ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customerbankstatementmonth
ALTER TABLE customerbankstatementmonth ADD FOREIGN KEY (statement_id) REFERENCES customer_bank_statements(id);

-- Relations from customercomment
ALTER TABLE customercomment ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from customerbusinesshistory
ALTER TABLE customerbusinesshistory ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from securedocumenttoken
ALTER TABLE securedocumenttoken ADD FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Relations from documentaccesslog
ALTER TABLE documentaccesslog ADD FOREIGN KEY (token) REFERENCES secure_document_tokens(token);

-- Relations from customerbusinessprofile
ALTER TABLE customerbusinessprofile ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customerbusinessprofile ADD FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE customerbusinessprofile ADD FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE customerbusinessprofile ADD FOREIGN KEY (previous_version_id) REFERENCES customer_business_profiles(id);

-- Relations from customershareholder
ALTER TABLE customershareholder ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

-- Relations from customerexecutive
ALTER TABLE customerexecutive ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

-- Relations from customerloanrequest
ALTER TABLE customerloanrequest ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customerloanrequest ADD FOREIGN KEY (loan_id) REFERENCES loans(id);

-- Relations from customercollateral
ALTER TABLE customercollateral ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

-- Relations from customersupplier
ALTER TABLE customersupplier ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

-- Relations from customercustomer
ALTER TABLE customercustomer ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

-- Relations from customerdscranalysis
ALTER TABLE customerdscranalysis ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

-- Relations from customerapprovalcomment
ALTER TABLE customerapprovalcomment ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

-- End of schema
-- Tables: 72
-- Relations: 119
