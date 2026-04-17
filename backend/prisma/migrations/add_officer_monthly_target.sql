-- Add monthly target field to users table for officers
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthly_target" DECIMAL(15,2) DEFAULT 100000.00;

-- Add comment
COMMENT ON COLUMN "users"."monthly_target" IS 'Monthly collection target for officers (in THB)';
