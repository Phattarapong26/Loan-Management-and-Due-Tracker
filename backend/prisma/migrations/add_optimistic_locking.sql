-- Migration: Add Optimistic Locking (Version Field)
-- Purpose: Prevent race conditions in concurrent updates
-- Date: 2026-02-14
-- Priority: CRITICAL

-- Add version column to critical financial tables
ALTER TABLE loans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE product_budgets ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Add indexes for version-based queries
CREATE INDEX IF NOT EXISTS idx_loans_id_version ON loans(id, version);
CREATE INDEX IF NOT EXISTS idx_product_budgets_id_version ON product_budgets(id, version);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_id_version ON payment_schedules(id, version);
CREATE INDEX IF NOT EXISTS idx_payments_id_version ON payments(id, version);

-- Add comments
COMMENT ON COLUMN loans.version IS 'Optimistic locking version - increment on every update';
COMMENT ON COLUMN product_budgets.version IS 'Optimistic locking version - increment on every update';
COMMENT ON COLUMN payment_schedules.version IS 'Optimistic locking version - increment on every update';
COMMENT ON COLUMN payments.version IS 'Optimistic locking version - increment on every update';
