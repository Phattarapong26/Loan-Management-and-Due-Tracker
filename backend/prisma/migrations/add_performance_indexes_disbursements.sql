-- Performance Optimization: Add indexes for loan_disbursements table
-- This will significantly improve query performance for disbursement lookups

-- 1. Index for status filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_status 
ON "loan_disbursements"(status, "requested_date" DESC);

-- 2. Index for loan_id lookups
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_loan 
ON "loan_disbursements"("loan_id", status);

-- 3. Index for date range queries
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_date 
ON "loan_disbursements"("requested_date" DESC);

-- 4. Composite index for common filters
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_lookup 
ON "loan_disbursements"(status, "loan_id", "requested_date" DESC);

-- Analyze table to update statistics
ANALYZE "loan_disbursements";

