-- Extend invite_codes table to support role, expires_at, used, message, created_by
-- This migration adds the required fields for the invitation link feature

-- Add new columns to invite_codes table
ALTER TABLE invite_codes
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE;

-- Add index for expires_at for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at ON invite_codes(expires_at);

-- Add index for used for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_used ON invite_codes(used);

-- Add index for created_by for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);

-- Update existing invite codes to have default expires_at (48 hours from created_at)
UPDATE invite_codes
SET expires_at = created_at + INTERVAL '48 hours'
WHERE expires_at IS NULL;

-- Set default expires_at for future inserts (48 hours from now)
-- This will be handled in application code, but we set a default here for safety
ALTER TABLE invite_codes
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '48 hours');






