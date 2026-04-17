-- Add Customer Business Profile Tables
-- Migration: add_customer_business_profile
-- Created: 2026-02-20

-- =====================================================
-- 1. CustomerBusinessProfile (Master Table)
-- =====================================================
CREATE TABLE "customer_business_profiles" (
  "id" TEXT PRIMARY KEY,
  "customer_id" TEXT NOT NULL,
  
  -- Source Information
  "source_file_name" TEXT NOT NULL,
  "source_file_hash" TEXT,
  "document_id" TEXT,
  
  -- Processing Metadata
  "parser_version" TEXT NOT NULL DEFAULT 'v3.0',
  "match_confidence" DECIMAL(5,4) NOT NULL,
  "sheets_parsed" TEXT[] NOT NULL DEFAULT '{}',
  "warnings" TEXT[] NOT NULL DEFAULT '{}',
  
  -- Profile Status
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "review_status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP,
  "review_notes" TEXT,
  
  -- Versioning
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_latest" BOOLEAN NOT NULL DEFAULT true,
  "previous_version_id" TEXT,
  
  -- Enhanced Data (JSON)
  "enhanced_data" JSONB,
  "recommendation" TEXT,
  "metadata" JSONB,
  
  -- Timestamps
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_document" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_reviewer" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_previous_version" FOREIGN KEY ("previous_version_id") REFERENCES "customer_business_profiles"("id") ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT "unique_customer_version" UNIQUE ("customer_id", "version")
);

-- Indexes
CREATE INDEX "idx_profiles_customer_latest" ON "customer_business_profiles"("customer_id", "is_latest");
CREATE INDEX "idx_profiles_status" ON "customer_business_profiles"("status");
CREATE INDEX "idx_profiles_review_status" ON "customer_business_profiles"("review_status");
CREATE INDEX "idx_profiles_created_at" ON "customer_business_profiles"("created_at");

-- =====================================================
-- 2. CustomerShareholder
-- =====================================================
CREATE TABLE "customer_shareholders" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Shareholder Information
  "name" TEXT NOT NULL,
  "national_id" TEXT,
  "share_percentage" DECIMAL(5,2) NOT NULL,
  "share_value" DECIMAL(15,2) NOT NULL,
  "share_type" TEXT DEFAULT 'ORDINARY',
  
  -- Authority
  "has_signing_authority" BOOLEAN NOT NULL DEFAULT false,
  "signing_conditions" TEXT,
  "position" TEXT,
  
  -- Contact
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  
  -- Metadata
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_shareholders_profile" ON "customer_shareholders"("profile_id");
CREATE INDEX "idx_shareholders_name" ON "customer_shareholders"("name");

-- =====================================================
-- 3. CustomerExecutive
-- =====================================================
CREATE TABLE "customer_executives" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Personal Information
  "name" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "national_id" TEXT,
  "date_of_birth" DATE,
  "age" INTEGER,
  "marital_status" TEXT,
  
  -- Address
  "current_address" TEXT,
  "registered_address" TEXT,
  
  -- Education & Experience
  "education" TEXT,
  "experience" TEXT,
  
  -- Shareholding
  "is_shareholder" BOOLEAN NOT NULL DEFAULT false,
  "share_percentage" DECIMAL(5,2),
  "share_value" DECIMAL(15,2),
  
  -- Metadata
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_executives_profile" ON "customer_executives"("profile_id");

-- =====================================================
-- 4. CustomerLoanRequest
-- =====================================================
CREATE TABLE "customer_loan_requests" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Loan Details
  "loan_type" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "requested_amount" DECIMAL(15,2) NOT NULL,
  "purpose" TEXT,
  "term_months" INTEGER,
  
  -- Interest
  "proposed_interest_rate" TEXT,
  "interest_calculation" TEXT,
  
  -- Collateral
  "collateral_description" TEXT,
  "collateral_value" DECIMAL(15,2),
  
  -- Status
  "request_type" TEXT NOT NULL DEFAULT 'NEW',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  
  -- Link to actual loan
  "loan_id" TEXT UNIQUE,
  
  -- Metadata
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_loan" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_loan_requests_profile" ON "customer_loan_requests"("profile_id");
CREATE INDEX "idx_loan_requests_type" ON "customer_loan_requests"("loan_type");
CREATE INDEX "idx_loan_requests_status" ON "customer_loan_requests"("status");

-- =====================================================
-- 5. CustomerCollateral
-- =====================================================
CREATE TABLE "customer_collaterals" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Collateral Information
  "collateral_type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT,
  
  -- Valuation
  "estimated_value" DECIMAL(15,2) NOT NULL,
  "appraised_value" DECIMAL(15,2),
  "appraised_by" TEXT,
  "appraised_date" DATE,
  
  -- Ownership
  "owner_name" TEXT,
  "owner_relationship" TEXT,
  
  -- Legal Details
  "title_deed_number" TEXT,
  "land_office" TEXT,
  "registration_number" TEXT,
  
  -- Insurance
  "is_insured" BOOLEAN NOT NULL DEFAULT false,
  "insurance_company" TEXT,
  "insurance_value" DECIMAL(15,2),
  
  -- Metadata
  "order" INTEGER NOT NULL DEFAULT 0,
  "attachments" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_collaterals_profile" ON "customer_collaterals"("profile_id");
CREATE INDEX "idx_collaterals_type" ON "customer_collaterals"("collateral_type");

-- =====================================================
-- 6. CustomerSupplier
-- =====================================================
CREATE TABLE "customer_suppliers" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Supplier Information
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "contact_person" TEXT,
  
  -- Business Details
  "product_type" TEXT,
  "payment_terms" TEXT,
  "credit_limit" DECIMAL(15,2),
  
  -- Relationship
  "contact_duration" TEXT,
  "relationship_quality" TEXT,
  
  -- Metadata
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_suppliers_profile" ON "customer_suppliers"("profile_id");

-- =====================================================
-- 7. CustomerCustomer (ลูกค้า/ผู้ซื้อ)
-- =====================================================
CREATE TABLE "customer_customers" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Customer Information
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "contact_person" TEXT,
  
  -- Business Details
  "product_service" TEXT,
  "payment_terms" TEXT,
  "sales_proportion" DECIMAL(5,2),
  
  -- Relationship
  "contact_duration" TEXT,
  "relationship_quality" TEXT,
  
  -- Metadata
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_customers_profile" ON "customer_customers"("profile_id");

-- =====================================================
-- 8. CustomerDSCRAnalysis
-- =====================================================
CREATE TABLE "customer_dscr_analysis" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Analysis Period
  "analysis_year" INTEGER NOT NULL,
  "analysis_period" TEXT,
  
  -- Income
  "net_operating_income" DECIMAL(15,2) NOT NULL,
  "other_income" DECIMAL(15,2),
  "total_income" DECIMAL(15,2) NOT NULL,
  
  -- Debt Service
  "principal_payment" DECIMAL(15,2) NOT NULL,
  "interest_payment" DECIMAL(15,2) NOT NULL,
  "total_debt_service" DECIMAL(15,2) NOT NULL,
  
  -- DSCR Calculation
  "dscr_ratio" DECIMAL(5,2) NOT NULL,
  "dscr_status" TEXT NOT NULL,
  
  -- Breakdown
  "breakdown" JSONB,
  
  -- Metadata
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_dscr_profile" ON "customer_dscr_analysis"("profile_id");
CREATE INDEX "idx_dscr_year" ON "customer_dscr_analysis"("analysis_year");

-- =====================================================
-- 9. CustomerApprovalComment
-- =====================================================
CREATE TABLE "customer_approval_comments" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT NOT NULL,
  
  -- Comment Details
  "comment_type" TEXT NOT NULL,
  "comment_by" TEXT NOT NULL,
  "position" TEXT,
  
  -- Content
  "comments" TEXT NOT NULL,
  "risk_assessment" TEXT,
  "recommendation" TEXT,
  "decision" TEXT,
  
  -- Conditions
  "approved_amount" DECIMAL(15,2),
  "special_conditions" TEXT,
  
  -- Dates
  "comment_date" DATE NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT "fk_profile" FOREIGN KEY ("profile_id") REFERENCES "customer_business_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_approval_comments_profile" ON "customer_approval_comments"("profile_id");
CREATE INDEX "idx_approval_comments_type" ON "customer_approval_comments"("comment_type");

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE "customer_business_profiles" IS 'Master table for comprehensive business profile data from Excel parsing';
COMMENT ON TABLE "customer_shareholders" IS 'Shareholder information with signing authority';
COMMENT ON TABLE "customer_executives" IS 'Executive/management team profiles';
COMMENT ON TABLE "customer_loan_requests" IS 'Loan requests from business profile (existing + new)';
COMMENT ON TABLE "customer_collaterals" IS 'Collateral details for loan applications';
COMMENT ON TABLE "customer_suppliers" IS 'Supplier relationships';
COMMENT ON TABLE "customer_customers" IS 'Customer/buyer relationships';
COMMENT ON TABLE "customer_dscr_analysis" IS 'Debt Service Coverage Ratio analysis';
COMMENT ON TABLE "customer_approval_comments" IS 'Approval workflow comments and decisions';
