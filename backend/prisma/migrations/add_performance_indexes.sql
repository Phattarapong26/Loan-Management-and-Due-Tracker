-- ============================================
-- Performance Indexes Migration
-- Created: 2026-03-02
-- Purpose: Add missing indexes to improve query performance
-- ============================================

-- Customers Table Indexes
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Loans Table Indexes
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_branch_id ON loans(branch_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_officer_id ON loans(officer_id);
CREATE INDEX IF NOT EXISTS idx_loans_approved_by ON loans(approved_by);
CREATE INDEX IF NOT EXISTS idx_loans_loan_product_id ON loans(loan_product_id);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);
CREATE INDEX IF NOT EXISTS idx_loans_disbursement_date ON loans(disbursement_date);
CREATE INDEX IF NOT EXISTS idx_loans_maturity_date ON loans(maturity_date);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_loans_branch_status ON loans(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_customer_status ON loans(customer_id, status);

-- Payment Schedules Table Indexes
CREATE INDEX IF NOT EXISTS idx_payment_schedules_loan_id ON payment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_payment_date ON payment_schedules(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_created_at ON payment_schedules(created_at);

-- Composite indexes for payment schedules
CREATE INDEX IF NOT EXISTS idx_payment_schedules_loan_status ON payment_schedules(loan_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status_date ON payment_schedules(status, payment_date);

-- Payments Table Indexes
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_branch_id ON payments(branch_id);

-- Composite index for payments
CREATE INDEX IF NOT EXISTS idx_payments_loan_date ON payments(loan_id, payment_date);

-- Transactions Table Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- Audit Logs Table Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Composite index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Documents Table Indexes
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

-- Users Table Indexes
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Branches Table Indexes
CREATE INDEX IF NOT EXISTS idx_branches_branch_code ON branches(branch_code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);

-- Disbursements Table Indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_disbursements_loan_id ON disbursements(loan_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_status ON disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursements_created_at ON disbursements(created_at);
CREATE INDEX IF NOT EXISTS idx_disbursements_approved_by ON disbursements(approved_by);

-- Expenses Table Indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

-- Contact Logs Table Indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_contact_logs_customer_id ON contact_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_loan_id ON contact_logs(loan_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_created_by ON contact_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_contact_logs_contact_date ON contact_logs(contact_date);

-- Notifications Table Indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- Verification Queries
-- ============================================

-- Check all indexes on a table
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'loans';

-- Check index usage statistics
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- Find missing indexes (slow queries)
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats
-- WHERE schemaname = 'public'
-- ORDER BY abs(correlation) DESC;
