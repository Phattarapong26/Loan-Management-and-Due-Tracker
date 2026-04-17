-- Migration: Remove AML Checks System
-- Date: 2026-03-02
-- Reason: AML system not in use and lacks required data for compliance

-- Drop indexes first
DROP INDEX IF EXISTS aml_checks_customer_idx;
DROP INDEX IF EXISTS idx_aml_checks_check_type;

-- Drop the aml_checks table
DROP TABLE IF EXISTS aml_checks CASCADE;

-- Note: This removes the AML checking functionality
-- If needed in the future, will need to implement with proper:
-- - PEP screening
-- - Sanctions list checking
-- - UBO verification
-- - Source of funds validation
