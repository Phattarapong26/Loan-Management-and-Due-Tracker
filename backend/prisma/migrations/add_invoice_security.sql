-- Migration: Add Invoice Security Features
-- Description: เพิ่มระบบรักษาความปลอดภัยสำหรับ Invoice โดยใช้เลขบัตรประชาชนเป็นรหัสผ่าน
-- Created: 2026-02-07

-- สร้างตาราง invoice_access_logs สำหรับบันทึกการเข้าถึง Invoice
CREATE TABLE IF NOT EXISTS "invoice_access_logs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "resource_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "invoice_access_logs_customer_id_fkey" FOREIGN KEY ("customer_id") 
        REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS "invoice_access_logs_resource_id_idx" ON "invoice_access_logs"("resource_id");
CREATE INDEX IF NOT EXISTS "invoice_access_logs_customer_id_idx" ON "invoice_access_logs"("customer_id");
CREATE INDEX IF NOT EXISTS "invoice_access_logs_attempted_at_idx" ON "invoice_access_logs"("attempted_at");
CREATE INDEX IF NOT EXISTS "invoice_access_logs_success_idx" ON "invoice_access_logs"("success");

-- สร้าง composite index สำหรับ rate limiting
CREATE INDEX IF NOT EXISTS "invoice_access_logs_resourceId_attemptedAt_success_idx" 
    ON "invoice_access_logs"("resource_id", "attempted_at", "success");

-- เพิ่ม comment
COMMENT ON TABLE "invoice_access_logs" IS 'บันทึกการพยายามเข้าถึง Invoice เพื่อความปลอดภัยและ audit trail';
COMMENT ON COLUMN "invoice_access_logs"."resource_id" IS 'ID ของ resource ที่พยายามเข้าถึง (paymentScheduleId หรือ loanId)';
COMMENT ON COLUMN "invoice_access_logs"."customer_id" IS 'ID ของลูกค้าที่พยายามเข้าถึง';
COMMENT ON COLUMN "invoice_access_logs"."success" IS 'สถานะการเข้าถึง (true = สำเร็จ, false = ไม่สำเร็จ)';
COMMENT ON COLUMN "invoice_access_logs"."attempted_at" IS 'เวลาที่พยายามเข้าถึง';
COMMENT ON COLUMN "invoice_access_logs"."ip_address" IS 'IP Address ของผู้พยายามเข้าถึง';
COMMENT ON COLUMN "invoice_access_logs"."user_agent" IS 'User Agent ของผู้พยายามเข้าถึง';
