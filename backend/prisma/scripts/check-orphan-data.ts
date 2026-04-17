/**
 * Database Health Check: Orphan & Stale Data
 * รัน script นี้เพื่อตรวจสอบข้อมูลขยะและ orphan records
 *
 * วิธีรัน (ใช้ .env อัตโนมัติ):
 *   cd backend && npx tsx prisma/scripts/check-orphan-data.ts
 *
 * หรือเพิ่มใน package.json:
 *   "db:check-orphans": "tsx prisma/scripts/check-orphan-data.ts"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runQuery(
    title: string,
    query: string,
    type: 'list' | 'count' | 'stats' = 'list'
) {
    console.log('\n' + '='.repeat(60));
    console.log(`📋 ${title}`);
    console.log('='.repeat(60));

    try {
        const result = await prisma.$queryRawUnsafe<unknown[]>(query);

        if (result.length === 0) {
            console.log('✅ ไม่พบปัญหา');
        } else if (type === 'count') {
            const row = result[0] as Record<string, unknown>;
            const val = Object.values(row ?? {})[0];
            console.log(`จำนวน: ${val}`);
        } else if (type === 'stats') {
            console.table(result);
        } else {
            console.table(result);
        }
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

async function main() {
    console.log('\n🔍 กำลังตรวจสอบ Database Health...\n');

    await runQuery(
        '1. Loans ที่ productConfigId ชี้ไป ProductConfig ที่ไม่มีอยู่',
        `SELECT l.id, l.contract_number, l.product_config_id 
         FROM loans l 
         LEFT JOIN product_configs pc ON l.product_config_id = pc.id 
         WHERE l.product_config_id IS NOT NULL AND pc.id IS NULL`
    );

    await runQuery(
        '2. NextPaymentInvoice ที่ชี้ไป PaymentSchedule ที่ไม่มีอยู่',
        `SELECT npi.id, npi.invoice_number, npi.payment_schedule_id 
         FROM next_payment_invoices npi 
         LEFT JOIN payment_schedules ps ON npi.payment_schedule_id = ps.id 
         WHERE ps.id IS NULL`
    );

    await runQuery(
        '3. Documents ที่ customerId ชี้ไป Customer ที่ไม่มีอยู่',
        `SELECT d.id, d.file_name, d.customer_id 
         FROM documents d 
         LEFT JOIN customers c ON d.customer_id = c.id 
         WHERE d.customer_id IS NOT NULL AND c.id IS NULL`
    );

    await runQuery(
        '4a. PaymentReceipt ที่ชี้ไป Payment ที่ไม่มีอยู่',
        `SELECT pr.id, pr.receipt_number, pr.payment_id 
         FROM payment_receipts pr 
         LEFT JOIN payments p ON pr.payment_id = p.id 
         WHERE p.id IS NULL`
    );

    await runQuery(
        '4b. PaymentReceipt ที่ invoiceId ชี้ไป NextPaymentInvoice ที่ไม่มีอยู่',
        `SELECT pr.id, pr.receipt_number, pr.invoice_id 
         FROM payment_receipts pr 
         LEFT JOIN next_payment_invoices npi ON pr.invoice_id = npi.id 
         WHERE pr.invoice_id IS NOT NULL AND npi.id IS NULL`
    );

    await runQuery(
        '5. Sessions ที่หมดอายุแล้วแต่ยัง is_valid = true',
        `SELECT COUNT(*)::int as count FROM sessions 
         WHERE expires_at < NOW() AND is_valid = true`,
        'count'
    );

    await runQuery(
        '6. Sessions หมดอายุ (ตัวอย่าง 5 รายการ)',
        `SELECT id, user_id, expires_at, is_valid FROM sessions 
         WHERE expires_at < NOW() 
         ORDER BY expires_at DESC LIMIT 5`
    );

    await runQuery(
        '7. Notifications ที่ยังไม่ archive เก่ากว่า 90 วัน',
        `SELECT COUNT(*)::int as count FROM notifications 
         WHERE archived = false AND created_at < NOW() - INTERVAL '90 days'`,
        'count'
    );

    await runQuery(
        '8. Users ที่ branchId ชี้ไป Branch ที่ไม่มีอยู่',
        `SELECT u.id, u.email, u.branch_id 
         FROM users u 
         LEFT JOIN branches b ON u.branch_id = b.id 
         WHERE u.branch_id IS NOT NULL AND b.id IS NULL`
    );

    await runQuery(
        '9. Customers ที่ branchId ชี้ไป Branch ที่ไม่มีอยู่',
        `SELECT c.id, c.customer_code, c.branch_id 
         FROM customers c 
         LEFT JOIN branches b ON c.branch_id = b.id 
         WHERE b.id IS NULL`
    );

    await runQuery(
        '10. สรุป: จำนวน records ในตารางหลัก',
        `SELECT 'branches' as tbl, COUNT(*)::int as cnt FROM branches
         UNION ALL SELECT 'users', COUNT(*)::int FROM users
         UNION ALL SELECT 'customers', COUNT(*)::int FROM customers
         UNION ALL SELECT 'loans', COUNT(*)::int FROM loans
         UNION ALL SELECT 'payments', COUNT(*)::int FROM payments
         UNION ALL SELECT 'payment_schedules', COUNT(*)::int FROM payment_schedules
         UNION ALL SELECT 'invoices', COUNT(*)::int FROM invoices
         UNION ALL SELECT 'next_payment_invoices', COUNT(*)::int FROM next_payment_invoices
         UNION ALL SELECT 'documents', COUNT(*)::int FROM documents
         UNION ALL SELECT 'audit_logs', COUNT(*)::int FROM audit_logs
         UNION ALL SELECT 'sessions', COUNT(*)::int FROM sessions
         UNION ALL SELECT 'notifications', COUNT(*)::int FROM notifications`,
        'stats'
    );

    console.log('\n✅ ตรวจสอบเสร็จสิ้น\n');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
