-- ============================================
-- Check Database Indexes
-- ตรวจสอบว่ามี indexes อยู่แล้วหรือไม่
-- ============================================

-- 1. ดู indexes ทั้งหมดของแต่ละ table
-- ============================================

-- LoanProduct indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'LoanProduct'
ORDER BY indexname;

-- Loan indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Loan'
ORDER BY indexname;

-- Customer indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Customer'
ORDER BY indexname;

-- Disbursement indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Disbursement'
ORDER BY indexname;

-- Payment indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Payment'
ORDER BY indexname;

-- PaymentSchedule indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'PaymentSchedule'
ORDER BY indexname;

-- Branch indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Branch'
ORDER BY indexname;

-- User indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'User'
ORDER BY indexname;

-- ============================================
-- 2. ดู indexes ทั้งหมดในระบบ (สรุป)
-- ============================================

SELECT 
    schemaname,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY index_count DESC, tablename;

-- ============================================
-- 3. ดู table sizes และ index sizes
-- ============================================

SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 4. ดู missing indexes (ที่ควรมี)
-- ============================================

-- ตรวจสอบว่า foreign keys มี index หรือไม่
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name,
    CASE 
        WHEN i.indexname IS NULL THEN '❌ Missing Index'
        ELSE '✅ Has Index: ' || i.indexname
    END as index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes i
    ON i.tablename = tc.table_name
    AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
