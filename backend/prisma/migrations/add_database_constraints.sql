-- Migration: Add Database Constraints
-- Purpose: Prevent invalid data at database level
-- Date: 2026-02-14
-- Priority: CRITICAL

-- ============================================================================
-- LOANS TABLE CONSTRAINTS
-- ============================================================================

-- Prevent negative outstanding balance
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_outstanding_balance_positive;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_outstanding_balance_positive 
CHECK (outstanding_balance >= 0);

-- Prevent negative principal
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_principal_positive;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_principal_positive 
CHECK (principal > 0);

-- Prevent negative current principal
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_current_principal_positive;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_current_principal_positive 
CHECK (current_principal IS NULL OR current_principal >= 0);

-- Prevent invalid interest rate
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_interest_rate_range;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_interest_rate_range 
CHECK (interest_rate >= 0 AND interest_rate <= 100);

-- Prevent invalid term
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_term_months_positive;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_term_months_positive 
CHECK (term_months > 0 AND term_months <= 600);

-- Prevent negative accumulated interest
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_accumulated_interest_positive;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_accumulated_interest_positive 
CHECK (accumulated_interest IS NULL OR accumulated_interest >= 0);

-- Prevent negative total disbursed
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_total_disbursed_positive;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_total_disbursed_positive 
CHECK (total_disbursed >= 0);

-- Ensure total disbursed doesn't exceed principal
ALTER TABLE loans 
DROP CONSTRAINT IF EXISTS chk_loans_total_disbursed_max;

ALTER TABLE loans 
ADD CONSTRAINT chk_loans_total_disbursed_max 
CHECK (total_disbursed <= principal);

-- ============================================================================
-- PRODUCT_BUDGETS TABLE CONSTRAINTS
-- ============================================================================

-- Prevent negative total budget
ALTER TABLE product_budgets 
DROP CONSTRAINT IF EXISTS chk_product_budgets_total_positive;

ALTER TABLE product_budgets 
ADD CONSTRAINT chk_product_budgets_total_positive 
CHECK (total_budget_amount > 0);

-- Prevent negative available amount
ALTER TABLE product_budgets 
DROP CONSTRAINT IF EXISTS chk_product_budgets_available_positive;

ALTER TABLE product_budgets 
ADD CONSTRAINT chk_product_budgets_available_positive 
CHECK (available_amount >= 0);

-- Prevent negative committed amount
ALTER TABLE product_budgets 
DROP CONSTRAINT IF EXISTS chk_product_budgets_committed_positive;

ALTER TABLE product_budgets 
ADD CONSTRAINT chk_product_budgets_committed_positive 
CHECK (committed_amount >= 0);

-- Prevent negative disbursed amount
ALTER TABLE product_budgets 
DROP CONSTRAINT IF EXISTS chk_product_budgets_disbursed_positive;

ALTER TABLE product_budgets 
ADD CONSTRAINT chk_product_budgets_disbursed_positive 
CHECK (disbursed_amount >= 0);

-- Ensure committed + available <= total
ALTER TABLE product_budgets 
DROP CONSTRAINT IF EXISTS chk_product_budgets_total_balance;

ALTER TABLE product_budgets 
ADD CONSTRAINT chk_product_budgets_total_balance 
CHECK (committed_amount + available_amount <= total_budget_amount);

-- ============================================================================
-- PAYMENTS TABLE CONSTRAINTS
-- ============================================================================

-- Prevent negative payment amount
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS chk_payments_amount_positive;

ALTER TABLE payments 
ADD CONSTRAINT chk_payments_amount_positive 
CHECK (amount > 0);

-- Prevent future payment date (allow up to 1 day in future for timezone)
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS chk_payments_date_not_future;

ALTER TABLE payments 
ADD CONSTRAINT chk_payments_date_not_future 
CHECK (payment_date <= CURRENT_TIMESTAMP + INTERVAL '1 day');

-- Prevent negative penalty amount
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS chk_payments_penalty_positive;

ALTER TABLE payments 
ADD CONSTRAINT chk_payments_penalty_positive 
CHECK (penalty_amount IS NULL OR penalty_amount >= 0);

-- ============================================================================
-- PAYMENT_SCHEDULES TABLE CONSTRAINTS
-- ============================================================================

-- Prevent negative principal amount
ALTER TABLE payment_schedules 
DROP CONSTRAINT IF EXISTS chk_payment_schedules_principal_positive;

ALTER TABLE payment_schedules 
ADD CONSTRAINT chk_payment_schedules_principal_positive 
CHECK (principal_amount >= 0);

-- Prevent negative interest amount
ALTER TABLE payment_schedules 
DROP CONSTRAINT IF EXISTS chk_payment_schedules_interest_positive;

ALTER TABLE payment_schedules 
ADD CONSTRAINT chk_payment_schedules_interest_positive 
CHECK (interest_amount >= 0);

-- Prevent negative total payment
ALTER TABLE payment_schedules 
DROP CONSTRAINT IF EXISTS chk_payment_schedules_total_positive;

ALTER TABLE payment_schedules 
ADD CONSTRAINT chk_payment_schedules_total_positive 
CHECK (total_payment >= 0);

-- Ensure total = principal + interest (with tolerance for rounding)
ALTER TABLE payment_schedules 
DROP CONSTRAINT IF EXISTS chk_payment_schedules_total_sum;

ALTER TABLE payment_schedules 
ADD CONSTRAINT chk_payment_schedules_total_sum 
CHECK (ABS(total_payment - (principal_amount + interest_amount)) < 1.00);

-- Prevent negative remaining balance
ALTER TABLE payment_schedules 
DROP CONSTRAINT IF EXISTS chk_payment_schedules_remaining_positive;

ALTER TABLE payment_schedules 
ADD CONSTRAINT chk_payment_schedules_remaining_positive 
CHECK (remaining_balance >= 0);

-- Prevent negative penalty
ALTER TABLE payment_schedules 
DROP CONSTRAINT IF EXISTS chk_payment_schedules_penalty_positive;

ALTER TABLE payment_schedules 
ADD CONSTRAINT chk_payment_schedules_penalty_positive 
CHECK (penalty_amount >= 0);

-- ============================================================================
-- LOAN_DISBURSEMENTS TABLE CONSTRAINTS
-- ============================================================================

-- Prevent negative disbursement amount
ALTER TABLE loan_disbursements 
DROP CONSTRAINT IF EXISTS chk_loan_disbursements_amount_positive;

ALTER TABLE loan_disbursements 
ADD CONSTRAINT chk_loan_disbursements_amount_positive 
CHECK (amount > 0);

-- ============================================================================
-- BUDGET_CONSUMPTION TABLE CONSTRAINTS
-- ============================================================================

-- Prevent negative requested amount
ALTER TABLE budget_consumption 
DROP CONSTRAINT IF EXISTS chk_budget_consumption_requested_positive;

ALTER TABLE budget_consumption 
ADD CONSTRAINT chk_budget_consumption_requested_positive 
CHECK (requested_amount > 0);

-- Prevent negative approved amount
ALTER TABLE budget_consumption 
DROP CONSTRAINT IF EXISTS chk_budget_consumption_approved_positive;

ALTER TABLE budget_consumption 
ADD CONSTRAINT chk_budget_consumption_approved_positive 
CHECK (approved_amount >= 0);

-- Prevent negative disbursed amount
ALTER TABLE budget_consumption 
DROP CONSTRAINT IF EXISTS chk_budget_consumption_disbursed_positive;

ALTER TABLE budget_consumption 
ADD CONSTRAINT chk_budget_consumption_disbursed_positive 
CHECK (disbursed_amount >= 0);

-- Ensure approved <= requested
ALTER TABLE budget_consumption 
DROP CONSTRAINT IF EXISTS chk_budget_consumption_approved_max;

ALTER TABLE budget_consumption 
ADD CONSTRAINT chk_budget_consumption_approved_max 
CHECK (approved_amount <= requested_amount);

-- Ensure disbursed <= approved
ALTER TABLE budget_consumption 
DROP CONSTRAINT IF EXISTS chk_budget_consumption_disbursed_max;

ALTER TABLE budget_consumption 
ADD CONSTRAINT chk_budget_consumption_disbursed_max 
CHECK (disbursed_amount <= approved_amount);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT chk_loans_outstanding_balance_positive ON loans 
IS 'Prevents negative outstanding balance - critical for financial integrity';

COMMENT ON CONSTRAINT chk_product_budgets_available_positive ON product_budgets 
IS 'Prevents budget overcommitment - critical for budget control';

COMMENT ON CONSTRAINT chk_payments_amount_positive ON payments 
IS 'Prevents negative or zero payments - critical for payment processing';
