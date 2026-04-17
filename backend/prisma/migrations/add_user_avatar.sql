-- Add avatar column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);

-- Add comment
COMMENT ON COLUMN users.avatar IS 'URL to user avatar image from Flaticon or other sources';
