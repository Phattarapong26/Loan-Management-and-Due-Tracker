-- Migration: Add Idempotency Keys
-- Purpose: Prevent duplicate operations
-- Date: 2026-02-14
-- Priority: CRITICAL

-- Add idempotency_key to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index on idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key 
ON payments(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add idempotency_key to loan_disbursements table
ALTER TABLE loan_disbursements 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index on idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_disbursements_idempotency_key 
ON loan_disbursements(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add idempotency_key to budget_consumption table
ALTER TABLE budget_consumption 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index on idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_consumption_idempotency_key 
ON budget_consumption(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add processed_at timestamp for tracking
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

ALTER TABLE loan_disbursements 
ADD COLUMN IF NOT EXISTS processed_at_final TIMESTAMP;

ALTER TABLE budget_consumption 
ADD COLUMN IF NOT EXISTS processed_at_final TIMESTAMP;

-- Add comments
COMMENT ON COLUMN payments.idempotency_key IS 'Unique key to prevent duplicate payment processing';
COMMENT ON COLUMN loan_disbursements.idempotency_key IS 'Unique key to prevent duplicate disbursement processing';
COMMENT ON COLUMN budget_consumption.idempotency_key IS 'Unique key to prevent duplicate budget consumption';
