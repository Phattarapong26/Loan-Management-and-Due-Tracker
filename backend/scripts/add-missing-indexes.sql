-- Add Missing Performance-Critical Indexes
-- Generated: 2026-02-14
-- Purpose: Fix slow API response times (Cold Start problem)

-- 1. LoanProduct status index (for filtering active products)
CREATE INDEX IF NOT EXISTS "LoanProduct_status_idx" ON "loan_products"(status);

-- 2. Loan status index (for filtering loans by status)
CREATE INDEX IF NOT EXISTS "Loan_status_idx" ON "loans"(status);

-- 3. Loan branchId index (for Branch Manager Dashboard)
CREATE INDEX IF NOT EXISTS "Loan_branchId_idx" ON "loans"("branch_id");

-- 4. Customer businessName index (for customer search)
CREATE INDEX IF NOT EXISTS "Customer_businessName_idx" ON "customers"("business_name");

-- 5. Disbursement status index (for filtering disbursements)
CREATE INDEX IF NOT EXISTS "Disbursement_status_idx" ON "loan_disbursements"(status);

-- 6. PaymentSchedule status index (for filtering payment schedules)
CREATE INDEX IF NOT EXISTS "PaymentSchedule_status_idx" ON "payment_schedules"(status);

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname IN (
        'LoanProduct_status_idx',
        'Loan_status_idx',
        'Loan_branchId_idx',
        'Customer_businessName_idx',
        'Disbursement_status_idx',
        'Payment_status_idx',
        'PaymentSchedule_status_idx'
    )
ORDER BY tablename, indexname;
