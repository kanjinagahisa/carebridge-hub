-- Add client_id to posts table for client timeline posts
-- Make group_id nullable to support both group posts and client posts
-- Add constraint to ensure either group_id or client_id is set (but not both)

-- Step 1: Make group_id nullable
ALTER TABLE posts
  ALTER COLUMN group_id DROP NOT NULL;

-- Step 2: Add client_id column (nullable)
ALTER TABLE posts
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Step 3: Add constraint to ensure either group_id or client_id is set (but not both)
ALTER TABLE posts
  ADD CONSTRAINT posts_group_or_client_check
  CHECK (
    (group_id IS NOT NULL AND client_id IS NULL) OR
    (group_id IS NULL AND client_id IS NOT NULL)
  );

-- Step 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_client_id ON posts(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_client_id_created_at ON posts(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group_id_created_at ON posts(group_id, created_at DESC) WHERE group_id IS NOT NULL;

-- Step 5: Add index for post_reads (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_post_reads_user_id_post_id ON post_reads(user_id, post_id);

-- Step 6: Add index for attachments
CREATE INDEX IF NOT EXISTS idx_attachments_post_id ON attachments(post_id);






