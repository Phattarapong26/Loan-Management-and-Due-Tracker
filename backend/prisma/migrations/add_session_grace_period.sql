-- Add grace period fields to sessions table for race condition prevention
-- This allows old tokens to work for a short period after refresh

ALTER TABLE sessions 
ADD COLUMN previous_token TEXT,
ADD COLUMN previous_token_expires_at TIMESTAMP,
ADD COLUMN previous_refresh_token TEXT;

-- Add indexes for performance
CREATE INDEX idx_sessions_previous_token ON sessions(previous_token);
CREATE INDEX idx_sessions_previous_token_expires_at ON sessions(previous_token_expires_at);

-- Clean up expired previous tokens (optional maintenance)
COMMENT ON COLUMN sessions.previous_token IS 'Old access token kept for grace period (30 seconds) to prevent race condition';
COMMENT ON COLUMN sessions.previous_token_expires_at IS 'When the previous token grace period expires';
COMMENT ON COLUMN sessions.previous_refresh_token IS 'Old refresh token for rotation detection';
