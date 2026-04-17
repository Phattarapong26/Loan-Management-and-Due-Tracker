-- SME D Bank Database Schema for DrawDB
-- Generated: 2026-02-20
-- Clean schema without PostgreSQL-specific syntax

-- Users and Authentication
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    branch_id VARCHAR(36),
    phone VARCHAR(20),
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    manager_id VARCHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    registration_number VARCHAR(50),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    line_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PROSPECT',
    branch_id VARCHAR(36),
    assigned_officer_id VARCHAR(36),
    annual_revenue DECIMAL(15,2),
    total_assets DECIMAL(15,2),
    total_liabilities DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Profile (New)
CREATE TABLE customer_business_profiles (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    source_file_name VARCHAR(255) NOT NULL,
    document_id VARCHAR(36),
    parser_version VARCHAR(50) DEFAULT 'v3.0',
    match_confidence DECIMAL(5,4) NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    review_status VARCHAR(50) DEFAULT 'PENDING',
    reviewed_by VARCHAR(36),
    reviewed_at TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_latest BOOLEAN DEFAULT true,
    previous_version_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE customer_shareholders (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    national_id VARCHAR(50),
    share_percentage DECIMAL(5,2) NOT NULL,
    share_value DECIMAL(15,2) NOT NULL,
    share_type VARCHAR(50) DEFAULT 'ORDINARY',
    has_signing_authority BOOLEAN DEFAULT false,
    signing_conditions TEXT,
    position VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_loan_requests (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    product_name VARCHAR(255),
    requested_amount DECIMAL(15,2) NOT NULL,
    purpose TEXT,
    term_months INTEGER,
    proposed_interest_rate VARCHAR(50),
    interest_calculation VARCHAR(50),
    collateral_description TEXT,
    collateral_value DECIMAL(15,2),
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    loan_id VARCHAR(36),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_collaterals (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    collateral_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    estimated_value DECIMAL(15,2) NOT NULL,
    appraised_value DECIMAL(15,2),
    appraised_by VARCHAR(255),
    appraised_date DATE,
    owner_name VARCHAR(255),
    owner_relationship VARCHAR(100),
    title_deed_number VARCHAR(100),
    land_office VARCHAR(255),
    registration_number VARCHAR(100),
    is_insured BOOLEAN DEFAULT false,
    insurance_company VARCHAR(255),
    insurance_value DECIMAL(15,2),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_executives (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    national_id VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    has_signing_authority BOOLEAN DEFAULT false,
    signing_conditions TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_suppliers (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    contact_person VARCHAR(255),
    product_type VARCHAR(255),
    payment_terms VARCHAR(255),
    credit_limit DECIMAL(15,2),
    contact_duration VARCHAR(100),
    relationship_quality VARCHAR(50),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_customers (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    contact_person VARCHAR(255),
    product_service VARCHAR(255),
    payment_terms VARCHAR(255),
    sales_proportion DECIMAL(5,2),
    contact_duration VARCHAR(100),
    relationship_quality VARCHAR(50),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_dscr_analysis (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    analysis_year INTEGER NOT NULL,
    analysis_period VARCHAR(50),
    net_operating_income DECIMAL(15,2) NOT NULL,
    other_income DECIMAL(15,2),
    total_income DECIMAL(15,2) NOT NULL,
    principal_payment DECIMAL(15,2) NOT NULL,
    interest_payment DECIMAL(15,2) NOT NULL,
    total_debt_service DECIMAL(15,2) NOT NULL,
    dscr_ratio DECIMAL(5,2) NOT NULL,
    dscr_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_approval_comments (
    id VARCHAR(36) PRIMARY KEY,
    profile_id VARCHAR(36) NOT NULL,
    comment_type VARCHAR(50) NOT NULL,
    comment_by VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    comments TEXT NOT NULL,
    risk_assessment TEXT,
    recommendation TEXT,
    decision VARCHAR(50),
    approved_amount DECIMAL(15,2),
    special_conditions TEXT,
    comment_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan Products
CREATE TABLE loan_products (
    id VARCHAR(36) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    loan_type VARCHAR(50) NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,
    min_term_months INTEGER NOT NULL,
    max_term_months INTEGER NOT NULL,
    base_interest_rate DECIMAL(5,2) NOT NULL,
    interest_calculation_method VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE year_interest_tiers (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    year_from INTEGER NOT NULL,
    year_to INTEGER,
    interest_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans
CREATE TABLE loans (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    principal DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    disbursement_date DATE,
    maturity_date DATE,
    outstanding_balance DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    loan_id VARCHAR(36) NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_schedules (
    id VARCHAR(36) PRIMARY KEY,
    loan_id VARCHAR(36) NOT NULL,
    due_date DATE NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(36),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact Logs
CREATE TABLE contact_logs (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    contact_method VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    result TEXT,
    next_action TEXT,
    contact_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foreign Keys
ALTER TABLE users ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE branches ADD FOREIGN KEY (manager_id) REFERENCES users(id);
ALTER TABLE customers ADD FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE customers ADD FOREIGN KEY (assigned_officer_id) REFERENCES users(id);

ALTER TABLE customer_business_profiles ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customer_business_profiles ADD FOREIGN KEY (document_id) REFERENCES documents(id);
ALTER TABLE customer_business_profiles ADD FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE customer_business_profiles ADD FOREIGN KEY (previous_version_id) REFERENCES customer_business_profiles(id);

ALTER TABLE customer_shareholders ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customer_loan_requests ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customer_collaterals ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customer_executives ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customer_suppliers ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customer_customers ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customer_dscr_analysis ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);
ALTER TABLE customer_approval_comments ADD FOREIGN KEY (profile_id) REFERENCES customer_business_profiles(id);

ALTER TABLE year_interest_tiers ADD FOREIGN KEY (product_id) REFERENCES loan_products(id);
ALTER TABLE loans ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE loans ADD FOREIGN KEY (product_id) REFERENCES loan_products(id);
ALTER TABLE payments ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE payment_schedules ADD FOREIGN KEY (loan_id) REFERENCES loans(id);
ALTER TABLE documents ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE documents ADD FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE contact_logs ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE contact_logs ADD FOREIGN KEY (user_id) REFERENCES users(id);
