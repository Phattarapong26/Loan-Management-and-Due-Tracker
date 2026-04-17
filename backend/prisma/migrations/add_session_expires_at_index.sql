-- Add index on expires_at column for faster session cleanup
-- This will significantly improve the performance of the session cleanup job

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at 
ON sessions (expires_at);

-- Add composite index for active session queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active 
ON sessions (is_valid, expires_at) 
WHERE is_valid = true;

-- Add index for user session queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active 
ON sessions (user_id, is_valid, expires_at) 
WHERE is_valid = true;

-- Add index for previous token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_previous_token_expires 
ON sessions (previous_token_expires_at) 
WHERE previous_token_expires_at IS NOT NULL;