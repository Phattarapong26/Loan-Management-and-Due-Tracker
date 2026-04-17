-- Performance Optimization: Add indexes for product_budgets table
-- This will significantly improve query performance for budget lookups

-- 1. Composite index for getBudgetsBatch and getBudgetByProduct
-- Covers: product_id + fiscal_year + quarter lookups
CREATE INDEX IF NOT EXISTS idx_product_budgets_lookup 
ON product_budgets(product_id, fiscal_year, quarter);

-- 2. Index for active budgets filtering
-- Partial index for better performance on active budget queries
CREATE INDEX IF NOT EXISTS idx_product_budgets_active 
ON product_budgets(budget_status) 
WHERE budget_status = 'ACTIVE';

-- 3. Index for budget consumption lookups
-- Covers: product_budget_id + loan_id + status
CREATE INDEX IF NOT EXISTS idx_budget_consumption_lookup 
ON budget_consumption(product_budget_id, loan_id, status);

-- 4. Index for budget consumption by status
-- For queries filtering by consumption status
CREATE INDEX IF NOT EXISTS idx_budget_consumption_status 
ON budget_consumption(status, consumption_date DESC);

-- 5. Index for fiscal year queries
-- For queries filtering by fiscal year across all products
CREATE INDEX IF NOT EXISTS idx_product_budgets_fiscal_year 
ON product_budgets(fiscal_year, budget_status);

-- Analyze tables to update statistics
ANALYZE product_budgets;
ANALYZE budget_consumption;

