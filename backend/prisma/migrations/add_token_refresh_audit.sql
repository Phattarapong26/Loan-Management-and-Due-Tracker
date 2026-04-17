-- Add audit log table for token refresh tracking
-- This helps investigate security incidents and token theft

CREATE TABLE IF NOT EXISTS token_refresh_audit (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    old_access_token TEXT,
    new_access_token TEXT,
    old_refresh_token TEXT,
    new_refresh_token TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    refresh_reason VARCHAR(50) DEFAULT 'USER_INITIATED',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_token_refresh_audit_user_id ON token_refresh_audit(user_id);
CREATE INDEX idx_token_refresh_audit_session_id ON token_refresh_audit(session_id);
CREATE INDEX idx_token_refresh_audit_created_at ON token_refresh_audit(created_at);

-- Add comments
COMMENT ON TABLE token_refresh_audit IS 'Audit log for all token refresh operations';
COMMENT ON COLUMN token_refresh_audit.refresh_reason IS 'Reason for refresh: USER_INITIATED, PREEMPTIVE, EXPIRED, GRACE_PERIOD';
COMMENT ON COLUMN token_refresh_audit.old_access_token IS 'First 50 chars of old token for tracking';
COMMENT ON COLUMN token_refresh_audit.new_access_token IS 'First 50 chars of new token for tracking';
