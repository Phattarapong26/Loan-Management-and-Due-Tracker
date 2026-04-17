-- Add new collection action types and approval system
-- This extends the existing ContactLog system with more sophisticated actions

-- Add new enum values for ContactMethod
ALTER TYPE "ContactMethod" ADD VALUE IF NOT EXISTS 'SMS';
ALTER TYPE "ContactMethod" ADD VALUE IF NOT EXISTS 'LEGAL_ACTION';
ALTER TYPE "ContactMethod" ADD VALUE IF NOT EXISTS 'RESTRUCTURE';
ALTER TYPE "ContactMethod" ADD VALUE IF NOT EXISTS 'SETTLEMENT';

-- Add new enum values for ContactStatus  
ALTER TYPE "ContactStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PLAN_OFFERED';
ALTER TYPE "ContactStatus" ADD VALUE IF NOT EXISTS 'RESTRUCTURE_REQUESTED';
ALTER TYPE "ContactStatus" ADD VALUE IF NOT EXISTS 'SETTLEMENT_NEGOTIATED';
ALTER TYPE "ContactStatus" ADD VALUE IF NOT EXISTS 'LEGAL_ACTION_INITIATED';
ALTER TYPE "ContactStatus" ADD VALUE IF NOT EXISTS 'APPROVAL_PENDING';
ALTER TYPE "ContactStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ContactStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Create collection_actions table for enhanced tracking
CREATE TABLE IF NOT EXISTS "collection_actions" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" TEXT NOT NULL,
  "loan_id" TEXT,
  "schedule_id" TEXT,
  "action_type" TEXT NOT NULL, -- 'call', 'sms', 'email', 'visit', 'payment_plan', 'restructure', 'settlement', 'legal'
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  "agent_id" TEXT NOT NULL,
  "notes" TEXT,
  "amount" DECIMAL(15,2), -- For payment plans, settlements
  "follow_up_date" TIMESTAMP,
  "estimated_duration_minutes" INTEGER,
  "requires_approval" BOOLEAN DEFAULT FALSE,
  "approval_status" TEXT, -- 'PENDING', 'APPROVED', 'REJECTED'
  "approved_by" TEXT,
  "approved_at" TIMESTAMP,
  "rejection_reason" TEXT,
  "completed_at" TIMESTAMP,
  "result" TEXT, -- Outcome description
  "metadata" JSONB, -- Additional action-specific data
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "fk_collection_actions_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_collection_actions_loan" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_collection_actions_schedule" FOREIGN KEY ("schedule_id") REFERENCES "payment_schedules"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_collection_actions_agent" FOREIGN KEY ("agent_id") REFERENCES "users"("id"),
  CONSTRAINT "fk_collection_actions_approver" FOREIGN KEY ("approved_by") REFERENCES "users"("id")
);

-- Create indexes for collection_actions
CREATE INDEX IF NOT EXISTS "idx_collection_actions_customer" ON "collection_actions"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_loan" ON "collection_actions"("loan_id");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_agent" ON "collection_actions"("agent_id");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_status" ON "collection_actions"("status");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_type" ON "collection_actions"("action_type");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_priority" ON "collection_actions"("priority");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_approval" ON "collection_actions"("approval_status");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_created" ON "collection_actions"("created_at");
CREATE INDEX IF NOT EXISTS "idx_collection_actions_follow_up" ON "collection_actions"("follow_up_date");

-- Create collection_action_history for audit trail
CREATE TABLE IF NOT EXISTS "collection_action_history" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "action_id" TEXT NOT NULL,
  "status_from" TEXT,
  "status_to" TEXT NOT NULL,
  "changed_by" TEXT NOT NULL,
  "change_reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "fk_collection_action_history_action" FOREIGN KEY ("action_id") REFERENCES "collection_actions"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_collection_action_history_user" FOREIGN KEY ("changed_by") REFERENCES "users"("id")
);

-- Create indexes for collection_action_history
CREATE INDEX IF NOT EXISTS "idx_collection_action_history_action" ON "collection_action_history"("action_id");
CREATE INDEX IF NOT EXISTS "idx_collection_action_history_created" ON "collection_action_history"("created_at");

-- Add new fields to existing contact_logs table to link with collection_actions
ALTER TABLE "contact_logs" ADD COLUMN IF NOT EXISTS "action_id" TEXT;
ALTER TABLE "contact_logs" ADD COLUMN IF NOT EXISTS "action_type" TEXT;
ALTER TABLE "contact_logs" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'MEDIUM';
ALTER TABLE "contact_logs" ADD COLUMN IF NOT EXISTS "estimated_duration_minutes" INTEGER;
ALTER TABLE "contact_logs" ADD COLUMN IF NOT EXISTS "actual_duration_minutes" INTEGER;
ALTER TABLE "contact_logs" ADD COLUMN IF NOT EXISTS "result_category" TEXT; -- 'SUCCESS', 'PARTIAL', 'FAILED', 'NO_CONTACT'

-- Add foreign key constraint for action_id
ALTER TABLE "contact_logs" ADD CONSTRAINT "fk_contact_logs_action" 
  FOREIGN KEY ("action_id") REFERENCES "collection_actions"("id") ON DELETE SET NULL;

-- Create index for the new action_id field
CREATE INDEX IF NOT EXISTS "idx_contact_logs_action" ON "contact_logs"("action_id");

-- Update trigger for collection_actions updated_at
CREATE OR REPLACE FUNCTION update_collection_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_collection_actions_updated_at
  BEFORE UPDATE ON "collection_actions"
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_actions_updated_at();

-- Insert default collection action types configuration
INSERT INTO "system_configs" ("config_key", "config_value", "config_category", "description", "data_type", "created_by") 
VALUES 
  ('collection_action_types', '["call","sms","email","visit","payment_plan","restructure","settlement","legal"]', 'collection', 'Available collection action types', 'json', 'system'),
  ('collection_approval_required', '["visit","payment_plan","restructure","settlement","legal"]', 'collection', 'Action types that require approval', 'json', 'system'),
  ('collection_escalation_days', '{"overdue": 7, "critical": 30}', 'collection', 'Days for collection escalation', 'json', 'system')
ON CONFLICT ("config_key") DO NOTHING;