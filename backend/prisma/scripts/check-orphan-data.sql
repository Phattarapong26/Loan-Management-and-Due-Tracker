-- ============================================================================
-- Database Health Check: Orphan & Stale Data
-- รัน script นี้เพื่อตรวจสอบข้อมูลขยะและ orphan records
--
-- วิธีรัน (ใช้ psql):
--   psql $DATABASE_URL -f backend/prisma/scripts/check-orphan-data.sql
--
-- หรือจาก backend directory:
--   npx dotenv -e .env -- psql $DATABASE_URL -f prisma/scripts/check-orphan-data.sql
-- ============================================================================

\echo '=== 1. Loans ที่ productConfigId ชี้ไป ProductConfig ที่ไม่มีอยู่ ==='
SELECT l.id, l.contract_number, l.product_config_id 
FROM loans l 
LEFT JOIN product_configs pc ON l.product_config_id = pc.id 
WHERE l.product_config_id IS NOT NULL AND pc.id IS NULL;

\echo ''
\echo '=== 2. NextPaymentInvoice ที่ชี้ไป PaymentSchedule ที่ไม่มีอยู่ ==='
SELECT npi.id, npi.invoice_number, npi.payment_schedule_id 
FROM next_payment_invoices npi 
LEFT JOIN payment_schedules ps ON npi.payment_schedule_id = ps.id 
WHERE ps.id IS NULL;

\echo ''
\echo '=== 3. Documents ที่ customerId ชี้ไป Customer ที่ไม่มีอยู่ ==='
SELECT d.id, d.file_name, d.customer_id 
FROM documents d 
LEFT JOIN customers c ON d.customer_id = c.id 
WHERE d.customer_id IS NOT NULL AND c.id IS NULL;

\echo ''
\echo '=== 4a. PaymentReceipt ที่ชี้ไป Payment ที่ไม่มีอยู่ ==='
SELECT pr.id, pr.receipt_number, pr.payment_id 
FROM payment_receipts pr 
LEFT JOIN payments p ON pr.payment_id = p.id 
WHERE p.id IS NULL;

\echo ''
\echo '=== 4b. PaymentReceipt ที่ invoiceId ชี้ไป NextPaymentInvoice ที่ไม่มีอยู่ ==='
SELECT pr.id, pr.receipt_number, pr.invoice_id 
FROM payment_receipts pr 
LEFT JOIN next_payment_invoices npi ON pr.invoice_id = npi.id 
WHERE pr.invoice_id IS NOT NULL AND npi.id IS NULL;

\echo ''
\echo '=== 5. Sessions ที่หมดอายุแล้วแต่ยัง is_valid = true ==='
SELECT COUNT(*) as expired_sessions_count FROM sessions 
WHERE expires_at < NOW() AND is_valid = true;

\echo ''
\echo '=== 6. Sessions หมดอายุ (ตัวอย่าง 10 รายการ) ==='
SELECT id, user_id, expires_at, is_valid FROM sessions 
WHERE expires_at < NOW() 
ORDER BY expires_at DESC LIMIT 10;

\echo ''
\echo '=== 7. Notifications ที่ยังไม่ archive เก่ากว่า 90 วัน ==='
SELECT COUNT(*) as old_unarchived_notifications FROM notifications 
WHERE archived = false AND created_at < NOW() - INTERVAL '90 days';

\echo ''
\echo '=== 8. Users ที่ branchId ชี้ไป Branch ที่ไม่มีอยู่ ==='
SELECT u.id, u.email, u.branch_id 
FROM users u 
LEFT JOIN branches b ON u.branch_id = b.id 
WHERE u.branch_id IS NOT NULL AND b.id IS NULL;

\echo ''
\echo '=== 9. Customers ที่ branchId/createdBy ชี้ไป entity ที่ไม่มีอยู่ ==='
SELECT c.id, c.customer_code, c.branch_id 
FROM customers c 
LEFT JOIN branches b ON c.branch_id = b.id 
WHERE b.id IS NULL;

\echo ''
\echo '=== 10. ขนาดตารางหลัก (Table Sizes) ==='
SELECT 
  schemaname,
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

\echo ''
\echo '=== สรุป: จำนวน records ในตารางหลัก ==='
SELECT 'branches' as tbl, COUNT(*) as cnt FROM branches
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'loans', COUNT(*) FROM loans
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'payment_schedules', COUNT(*) FROM payment_schedules
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'next_payment_invoices', COUNT(*) FROM next_payment_invoices
UNION ALL SELECT 'documents', COUNT(*) FROM documents
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
