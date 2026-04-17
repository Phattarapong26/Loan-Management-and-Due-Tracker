-- CreateTable
CREATE TABLE "line_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "customer_id" TEXT,
    "action" TEXT NOT NULL,
    "line_user_id" TEXT,
    "previous_line_user_id" TEXT,
    "reason" TEXT,
    "performed_by" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "line_audit_logs_user_id_idx" ON "line_audit_logs"("user_id");
CREATE INDEX "line_audit_logs_customer_id_idx" ON "line_audit_logs"("customer_id");
CREATE INDEX "line_audit_logs_action_idx" ON "line_audit_logs"("action");
CREATE INDEX "line_audit_logs_line_user_id_idx" ON "line_audit_logs"("line_user_id");
CREATE INDEX "line_audit_logs_performed_by_idx" ON "line_audit_logs"("performed_by");
CREATE INDEX "line_audit_logs_created_at_idx" ON "line_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "line_audit_logs" ADD CONSTRAINT "line_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_audit_logs" ADD CONSTRAINT "line_audit_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_audit_logs" ADD CONSTRAINT "line_audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;