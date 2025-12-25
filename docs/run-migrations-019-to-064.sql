-- ============================================================================
-- CareBridge Hub - マイグレーション実行ファイル（019〜064）
-- ============================================================================
-- このファイルには、019から064までのマイグレーションファイルが
-- 順番に結合されています。
-- 
-- 注意: 001〜018は既に実行済みのため、このファイルには含まれていません
-- 
-- 使用方法:
-- 1. Supabase の SQL Editor で "New query" をクリック
-- 2. このファイルの内容をすべてコピー&ペースト
-- 3. "Run" をクリック
-- 4. エラーが発生した場合は、エラーメッセージを確認してください
-- 
-- 注意:
-- - 一部のマイグレーションファイルには検証クエリ（SELECT文）が含まれています
-- - 検証クエリの結果は表示されますが、エラーではありません
-- - 診断用のクエリ（プレースホルダーを含む）はコメントアウトされています
-- - エラーが発生した場合は、どのマイグレーションでエラーが発生したかを
--   コメントで確認してください
-- ============================================================================


-- ============================================================================
-- Migration: 019_fix_facility_insert_policy_using_service_role.sql
-- ============================================================================
-- Final fix: Try using a function-based approach to check authentication
-- The issue is that PostgREST may not be evaluating auth.uid() correctly
-- even when Authorization header is present with anon key
-- 
-- Solution: Create a SECURITY DEFINER function that explicitly checks auth.uid()
-- and use it in the RLS policy

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;

-- Create a function to check if user is authenticated
-- SECURITY DEFINER ensures it runs with elevated privileges
CREATE OR REPLACE FUNCTION check_user_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  -- Explicitly check if auth.uid() is not null
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy using the function
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (check_user_authenticated());














-- ============================================================================
-- Migration: 020_check_current_policies.sql
-- ============================================================================
-- Check current RLS policies for facilities table
-- This will help us understand what policies are currently active

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'facilities';

-- 2. Get all INSERT policies for facilities table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'facilities'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 3. Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 4. Check if check_user_authenticated function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'check_user_authenticated';














-- ============================================================================
-- Migration: 021_fix_facility_insert_policy_for_anon.sql
-- ============================================================================
-- Fix facilities INSERT policy to work with anon role
-- createBrowserClient uses anon key, so requests are sent as anon role
-- However, when Authorization header contains a valid JWT token,
-- PostgREST should still evaluate auth.uid() correctly
-- 
-- Solution: Create a policy that applies to anon role
-- and checks auth.uid() IS NOT NULL

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;

-- Drop the function if it exists (we'll use a simpler approach)
DROP FUNCTION IF EXISTS check_user_authenticated();

-- Create a policy that applies to anon role
-- This allows requests from createBrowserClient (which uses anon key)
-- but still enforces that auth.uid() IS NOT NULL (which requires a valid JWT)
CREATE POLICY "Anon users with valid JWT can create facilities"
  ON facilities FOR INSERT
  TO anon
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also create a policy for authenticated role (for completeness)
-- This covers cases where the request is sent with authenticated role
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);














-- ============================================================================
-- Migration: 022_fix_facility_insert_policy_drop_all.sql
-- ============================================================================
-- Fix facilities INSERT policy: Drop ALL existing policies first, then recreate
-- This ensures we start with a clean slate

-- Drop ALL existing INSERT policies on facilities table
-- We'll drop them by name to be safe, but also use a more comprehensive approach
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;
DROP POLICY IF EXISTS "Anon users with valid JWT can create facilities" ON facilities;
DROP POLICY IF EXISTS "facilities_insert_by_authenticated" ON facilities;
DROP POLICY IF EXISTS "facilities_insert_by_owner" ON facilities;

-- Also drop any policies that might have been created with different names
-- This will drop ALL INSERT policies on facilities table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'facilities' 
          AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON facilities', r.policyname);
    END LOOP;
END $$;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS check_user_authenticated();

-- Now create the policies we want
-- Policy for anon role (used by createBrowserClient)
CREATE POLICY "Anon users with valid JWT can create facilities"
  ON facilities FOR INSERT
  TO anon
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for authenticated role (for completeness)
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);














-- ============================================================================
-- Migration: 023_verify_and_fix_policies.sql
-- ============================================================================
-- Verify current RLS policies and fix if needed
-- This migration will check the current state and ensure correct policies are in place

-- Step 1: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'facilities';

-- Step 2: List all existing INSERT policies for facilities
SELECT 
  policyname,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'facilities'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 3: Drop ALL existing INSERT policies (to start fresh)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'facilities' 
          AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON facilities', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 4: Verify permissions for anon and authenticated roles
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- Step 5: Ensure permissions are granted
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON TABLE facilities TO anon;
GRANT SELECT ON TABLE facilities TO anon;
GRANT INSERT ON TABLE facilities TO authenticated;
GRANT SELECT ON TABLE facilities TO authenticated;

-- Step 6: Create the correct policies
-- Policy for anon role (used by createBrowserClient with anon key)
CREATE POLICY "Anon users with valid JWT can create facilities"
  ON facilities FOR INSERT
  TO anon
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for authenticated role (for completeness)
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 7: Verify the policies were created
SELECT 
  policyname,
  roles,
  cmd as command,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'facilities'
  AND cmd = 'INSERT'
ORDER BY policyname;














-- ============================================================================
-- Migration: 024_fix_user_facility_roles_select_policy.sql
-- ============================================================================
-- Fix user_facility_roles SELECT policy to avoid circular reference
-- The current policy uses get_user_facility_ids() which references user_facility_roles,
-- causing a circular dependency that prevents the middleware from seeing newly created records

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view roles in their facilities" ON user_facility_roles;

-- Create a new policy that directly checks user_id = auth.uid()
-- This avoids the circular reference and allows users to see their own roles
CREATE POLICY "Users can view their own roles"
  ON user_facility_roles FOR SELECT
  USING (
    user_id = auth.uid()
    AND deleted = FALSE
  );














-- ============================================================================
-- Migration: 025_ensure_policy_applied.sql
-- ============================================================================
-- 確実にRLSポリシーを適用するためのマイグレーション
-- 古いポリシーを完全に削除し、新しいポリシーを適用

-- 1. すべての既存のSELECTポリシーを削除（名前に関係なく）
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'user_facility_roles' 
          AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_facility_roles', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- 2. 新しいポリシーを作成（循環参照を避ける）
CREATE POLICY "Users can view their own roles"
  ON user_facility_roles FOR SELECT
  USING (
    user_id = auth.uid()
    AND deleted = FALSE
  );

-- 3. ポリシーが正しく作成されたか確認
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_facility_roles'
  AND cmd = 'SELECT';













-- ============================================================================
-- Migration: 026_create_client_documents.sql
-- ============================================================================
-- Client documents table
-- 利用者書類テーブル: 利用者に関連する書類（計画書、報告書など）を管理

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 種別（計画書 / 報告書 / その他 など）
  path TEXT NOT NULL, -- Storage 上のパス
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_created_at ON client_documents(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_client_documents_updated_at BEFORE UPDATE ON client_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;











-- ============================================================================
-- Migration: 027_client_documents_rls_policies.sql
-- ============================================================================
-- RLS policies for client_documents table
-- 利用者書類テーブルのRLSポリシー

-- Users can view client documents for clients in their facilities
CREATE POLICY "Users can view client documents in their facilities"
  ON client_documents FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
    AND deleted = FALSE
  );

-- Users can insert client documents for clients in their facilities
CREATE POLICY "Users can insert client documents in their facilities"
  ON client_documents FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );

-- Users can update client documents for clients in their facilities
CREATE POLICY "Users can update client documents in their facilities"
  ON client_documents FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );

-- Users can delete client documents for clients in their facilities
CREATE POLICY "Users can delete client documents in their facilities"
  ON client_documents FOR DELETE
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );











-- ============================================================================
-- Migration: 028_extend_invite_codes.sql
-- ============================================================================
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









-- ============================================================================
-- Migration: 029_invite_codes_rls_update.sql
-- ============================================================================
-- Update RLS policies for invite_codes table to support new fields
-- Allow users to update invite_codes (mark as used) for their facilities

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view invite codes for their facilities" ON invite_codes;
DROP POLICY IF EXISTS "Admins can create invite codes for their facilities" ON invite_codes;

-- Recreate SELECT policy (users can view invite codes for their facilities)
CREATE POLICY "Users can view invite codes for their facilities"
  ON invite_codes FOR SELECT
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

-- Recreate INSERT policy (admins can create invite codes for their facilities)
CREATE POLICY "Admins can create invite codes for their facilities"
  ON invite_codes FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT ufr.facility_id
      FROM user_facility_roles ufr
      WHERE ufr.user_id = auth.uid()
        AND ufr.role = 'admin'
        AND ufr.deleted = FALSE
    )
  );

-- Allow users to update invite codes (mark as used) for their facilities
-- This is needed when a user accepts an invite
CREATE POLICY "Users can update invite codes for their facilities"
  ON invite_codes FOR UPDATE
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  )
  WITH CHECK (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

-- Allow anonymous users to read invite codes by code (for the invite acceptance page)
-- This is needed because the invite acceptance page is accessible without login
CREATE POLICY "Anonymous users can view invite codes by code"
  ON invite_codes FOR SELECT
  USING (auth.uid() IS NULL);



-- ============================================================================
-- Migration: 030_facilities_update_policy.sql
-- ============================================================================
-- Add UPDATE policy for facilities table
-- Allow admin users to update facilities they belong to

CREATE POLICY "Admins can update facilities they belong to"
  ON facilities FOR UPDATE
  USING (
    id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND deleted = FALSE
  )
  WITH CHECK (
    id IN (
      SELECT ufr.facility_id
      FROM user_facility_roles ufr
      WHERE ufr.user_id = auth.uid()
        AND ufr.role = 'admin'
        AND ufr.deleted = FALSE
    )
    AND deleted = FALSE
  );









-- ============================================================================
-- Migration: 031_facilities_anonymous_invite_policy.sql
-- ============================================================================
-- Allow anonymous users to read facility information for valid invite codes
-- This is needed for the invite acceptance page to display facility name
-- and check if the facility is deleted

CREATE POLICY "Anonymous users can view facilities with valid invite codes"
  ON facilities FOR SELECT
  USING (
    auth.uid() IS NULL
    AND deleted = FALSE
    AND id IN (
      SELECT facility_id
      FROM invite_codes
      WHERE used = FALSE
        AND cancelled = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );








-- ============================================================================
-- Migration: 032_fix_invite_codes_anonymous_policy.sql
-- ============================================================================
-- Fix RLS policies for invite_codes to ensure anonymous users can read invite codes
-- The issue is that get_user_facility_ids(auth.uid()) may fail when auth.uid() IS NULL
-- We need to ensure the anonymous policy is evaluated first or separately

-- Drop the existing anonymous policy if it exists
DROP POLICY IF EXISTS "Anonymous users can view invite codes by code" ON invite_codes;

-- Recreate the anonymous policy with explicit conditions
-- This policy should allow anonymous users to read any invite code
-- (The application will filter by code on the client side)
CREATE POLICY "Anonymous users can view invite codes by code"
  ON invite_codes FOR SELECT
  USING (
    auth.uid() IS NULL
    AND used = FALSE
    AND cancelled = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Also ensure the get_user_facility_ids function handles NULL gracefully
-- Update the function to return empty result when user_id is NULL
CREATE OR REPLACE FUNCTION get_user_facility_ids(user_uuid UUID)
RETURNS TABLE(facility_id UUID) AS $$
BEGIN
  -- If user_uuid is NULL (anonymous user), return empty result
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT ufr.facility_id
  FROM user_facility_roles ufr
  WHERE ufr.user_id = user_uuid
    AND ufr.deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;








-- ============================================================================
-- Migration: 033_fix_invite_codes_policy_conflict.sql
-- ============================================================================
-- Fix RLS policy conflict for invite_codes
-- The issue is that "Users can view invite codes for their facilities" policy
-- is being evaluated even for anonymous users, causing conflicts
-- We need to ensure anonymous users can read invite codes, and authenticated users
-- can read invite codes for their facilities

-- Drop all existing SELECT policies on invite_codes
DROP POLICY IF EXISTS "Users can view invite codes for their facilities" ON invite_codes;
DROP POLICY IF EXISTS "Anonymous users can view invite codes by code" ON invite_codes;

-- Recreate the policy for authenticated users (only when auth.uid() IS NOT NULL)
CREATE POLICY "Users can view invite codes for their facilities"
  ON invite_codes FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

-- Recreate the policy for anonymous users (only when auth.uid() IS NULL)
-- This policy allows anonymous users to read any valid invite code
CREATE POLICY "Anonymous users can view invite codes by code"
  ON invite_codes FOR SELECT
  USING (
    auth.uid() IS NULL
    AND used = FALSE
    AND cancelled = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
  );








-- ============================================================================
-- Migration: 034_fix_invite_codes_authenticated_access.sql
-- ============================================================================
-- Fix RLS policy to allow authenticated users without facilities to read invite codes
-- The issue is that authenticated users who don't belong to any facility
-- cannot read invite codes, even though they need to accept the invite to join a facility
-- We need to allow authenticated users to read valid invite codes regardless of facility membership

-- Drop the existing policy for authenticated users
DROP POLICY IF EXISTS "Users can view invite codes for their facilities" ON invite_codes;

-- Recreate the policy for authenticated users
-- This policy allows authenticated users to:
-- 1. Read invite codes for facilities they belong to (for management purposes)
-- 2. Read any valid invite code (for accepting invites to join facilities)
CREATE POLICY "Users can view invite codes for their facilities"
  ON invite_codes FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Allow reading invite codes for facilities the user belongs to
      facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
      OR
      -- Allow reading any valid invite code (for accepting invites)
      (
        used = FALSE
        AND cancelled = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
      )
    )
  );








-- ============================================================================
-- Migration: 035_facilities_authenticated_invite_policy.sql
-- ============================================================================
-- Allow authenticated users to read facility information for valid invite codes
-- This is needed for authenticated users who don't belong to any facility yet
-- to be able to view facility information when accepting an invite

CREATE POLICY "Authenticated users can view facilities with valid invite codes"
  ON facilities FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted = FALSE
    AND id IN (
      SELECT facility_id
      FROM invite_codes
      WHERE used = FALSE
        AND cancelled = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );








-- ============================================================================
-- Migration: 036_add_client_id_to_posts.sql
-- ============================================================================
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








-- ============================================================================
-- Migration: 037_update_posts_rls_for_clients.sql
-- ============================================================================
-- Update RLS policies for posts to support client timeline posts
-- Posts can now be associated with either a group (group_id) or a client (client_id)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view posts in groups of their facilities" ON posts;
DROP POLICY IF EXISTS "Users can insert posts in groups of their facilities" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

-- Recreate SELECT policy to support both group and client posts
CREATE POLICY "Users can view posts in their facilities"
  ON posts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted = FALSE
    AND (
      -- Group posts: check via groups table
      (
        group_id IS NOT NULL
        AND group_id IN (
          SELECT id FROM groups
          WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND deleted = FALSE
        )
      )
      OR
      -- Client posts: check via clients table
      (
        client_id IS NOT NULL
        AND client_id IN (
          SELECT id FROM clients
          WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND deleted = FALSE
        )
      )
    )
  );

-- Recreate INSERT policy to support both group and client posts
CREATE POLICY "Users can insert posts in their facilities"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
    AND (
      -- Group posts: check via groups table
      (
        group_id IS NOT NULL
        AND client_id IS NULL
        AND group_id IN (
          SELECT id FROM groups
          WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND deleted = FALSE
        )
      )
      OR
      -- Client posts: check via clients table
      (
        client_id IS NOT NULL
        AND group_id IS NULL
        AND client_id IN (
          SELECT id FROM clients
          WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND deleted = FALSE
        )
      )
    )
  );

-- Recreate UPDATE policy (unchanged - users can update their own posts)
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() IS NOT NULL AND author_id = auth.uid());








-- ============================================================================
-- Migration: 038_update_post_reactions_rls_for_clients.sql
-- ============================================================================
-- Update RLS policies for post_reactions to support client timeline posts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view reactions to posts in their facilities" ON post_reactions;
DROP POLICY IF EXISTS "Users can insert reactions to posts in their facilities" ON post_reactions;

-- Recreate SELECT policy to support both group and client posts
CREATE POLICY "Users can view reactions to posts in their facilities"
  ON post_reactions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND post_id IN (
      SELECT id FROM posts
      WHERE deleted = FALSE
        AND (
          -- Group posts
          (
            group_id IS NOT NULL
            AND group_id IN (
              SELECT id FROM groups
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            client_id IS NOT NULL
            AND client_id IN (
              SELECT id FROM clients
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
        )
    )
  );

-- Recreate INSERT policy to support both group and client posts
CREATE POLICY "Users can insert reactions to posts in their facilities"
  ON post_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND post_id IN (
      SELECT id FROM posts
      WHERE deleted = FALSE
        AND (
          -- Group posts
          (
            group_id IS NOT NULL
            AND group_id IN (
              SELECT id FROM groups
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            client_id IS NOT NULL
            AND client_id IN (
              SELECT id FROM clients
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
        )
    )
  );








-- ============================================================================
-- Migration: 039_update_post_reads_rls_for_clients.sql
-- ============================================================================
-- Update RLS policies for post_reads to support client timeline posts

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reads" ON post_reads;
DROP POLICY IF EXISTS "Users can insert their own reads" ON post_reads;

-- Recreate SELECT policy to support both group and client posts
CREATE POLICY "Users can view reads for posts in their facilities"
  ON post_reads FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND post_id IN (
      SELECT id FROM posts
      WHERE deleted = FALSE
        AND (
          -- Group posts
          (
            group_id IS NOT NULL
            AND group_id IN (
              SELECT id FROM groups
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            client_id IS NOT NULL
            AND client_id IN (
              SELECT id FROM clients
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
        )
    )
  );

-- Recreate INSERT policy to support both group and client posts
CREATE POLICY "Users can insert reads for posts in their facilities"
  ON post_reads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND post_id IN (
      SELECT id FROM posts
      WHERE deleted = FALSE
        AND (
          -- Group posts
          (
            group_id IS NOT NULL
            AND group_id IN (
              SELECT id FROM groups
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            client_id IS NOT NULL
            AND client_id IN (
              SELECT id FROM clients
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
        )
    )
  );








-- ============================================================================
-- Migration: 040_update_attachments_rls_for_clients.sql
-- ============================================================================
-- Update RLS policies for attachments to support client timeline posts
-- Ensure attachments are only accessible for posts in user's facilities

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view attachments in their facilities" ON attachments;
DROP POLICY IF EXISTS "Users can insert attachments in their facilities" ON attachments;
DROP POLICY IF EXISTS "Users can update attachments in their facilities" ON attachments;

-- Recreate SELECT policy to support both group and client posts
CREATE POLICY "Users can view attachments in their facilities"
  ON attachments FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted = FALSE
    AND facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND post_id IN (
      SELECT id FROM posts
      WHERE deleted = FALSE
        AND (
          -- Group posts
          (
            group_id IS NOT NULL
            AND group_id IN (
              SELECT id FROM groups
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            client_id IS NOT NULL
            AND client_id IN (
              SELECT id FROM clients
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
        )
    )
  );

-- Recreate INSERT policy - only post author can insert attachments
CREATE POLICY "Users can insert attachments for their posts"
  ON attachments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND post_id IN (
      SELECT id FROM posts
      WHERE deleted = FALSE
        AND author_id = auth.uid()
        AND (
          -- Group posts
          (
            group_id IS NOT NULL
            AND group_id IN (
              SELECT id FROM groups
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            client_id IS NOT NULL
            AND client_id IN (
              SELECT id FROM clients
              WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
                AND deleted = FALSE
            )
          )
        )
    )
  );

-- Recreate UPDATE policy - only post author can update attachments
CREATE POLICY "Users can update attachments for their posts"
  ON attachments FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND post_id IN (
      SELECT id FROM posts
      WHERE deleted = FALSE
        AND author_id = auth.uid()
    )
  );








-- ============================================================================
-- Migration: 041_create_attachments_storage_bucket.sql
-- ============================================================================
-- Create attachments storage bucket
-- This migration creates the storage bucket and sets up policies for attachments

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: Storage buckets are created via Supabase Dashboard or API, not SQL
-- This is a reference migration file for documentation purposes

-- Step 2: Create storage policies for attachments bucket
-- These policies control who can read/write files in the attachments bucket

-- Policy: Authenticated users can read files from their facility's attachments
CREATE POLICY "Authenticated users can read attachments from their facilities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if the file path contains a client_id or group_id that belongs to user's facility
    -- File path format: {client_id}/{filename} or {group_id}/{filename}
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = (storage.foldername(name))[1]
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = (storage.foldername(name))[1]
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can upload files to their facility's attachments
CREATE POLICY "Authenticated users can upload attachments to their facilities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if the file path contains a client_id or group_id that belongs to user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = (storage.foldername(name))[1]
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = (storage.foldername(name))[1]
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from their facility's attachments
CREATE POLICY "Authenticated users can delete attachments from their facilities"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if the file path contains a client_id or group_id that belongs to user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = (storage.foldername(name))[1]
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = (storage.foldername(name))[1]
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Note: Storage bucket creation must be done via Supabase Dashboard:
-- 1. Go to Storage > Buckets
-- 2. Click "New bucket"
-- 3. Name: "attachments"
-- 4. Public: false (private bucket)
-- 5. File size limit: 50MB (or as needed)
-- 6. Allowed MIME types: image/*, application/pdf, video/*








-- ============================================================================
-- Migration: 042_simplified_attachments_storage_policy.sql
-- ============================================================================
-- Simplified storage policies for attachments bucket
-- This version uses a simpler approach that checks facility_id from attachments table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can read files if they belong to a facility they're part of
-- This checks the attachments table to verify facility_id
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM attachments
    WHERE attachments.file_url LIKE '%' || storage.objects.name || '%'
      OR attachments.file_url LIKE '%/' || storage.objects.name
      OR storage.objects.name LIKE '%' || split_part(attachments.file_url, '/', -1) || '%'
  )
  AND EXISTS (
    SELECT 1 FROM attachments att
    WHERE (
      att.file_url LIKE '%' || storage.objects.name || '%'
      OR att.file_url LIKE '%/' || storage.objects.name
      OR storage.objects.name LIKE '%' || split_part(att.file_url, '/', -1) || '%'
    )
    AND att.facility_id IN (
      SELECT facility_id FROM get_user_facility_ids(auth.uid())
    )
    AND att.deleted = FALSE
  )
);

-- Policy: Authenticated users can upload files to attachments bucket
-- File path should be in format: {client_id}/{filename} or {group_id}/{filename}
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Note: Storage bucket "attachments" must be created via Supabase Dashboard:
-- 1. Go to Storage > Buckets
-- 2. Click "New bucket"
-- 3. Name: "attachments"
-- 4. Public: false (private bucket)
-- 5. File size limit: 50MB (or as needed)
-- 6. Allowed MIME types: image/*, application/pdf, video/*








-- ============================================================================
-- Migration: 044_fix_storage_attachments_rls.sql
-- ============================================================================
-- Fix Storage RLS policies for attachments bucket
-- Ensure the policy correctly validates client_id from the file path

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to attachments bucket
-- File path format: {client_id}/{filename}
-- The policy checks if the first segment (client_id) belongs to a client in the user's facilities
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can read files from attachments bucket
-- This checks the attachments table to verify facility_id
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);



-- ============================================================================
-- Migration: 045_fix_storage_attachments_rls_v2.sql
-- ============================================================================
-- Fix Storage RLS policies for attachments bucket (v2)
-- Simplified and more reliable approach

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to attachments bucket
-- File path format: {client_id}/{filename} or {group_id}/{filename}
-- The policy checks if the first segment (client_id or group_id) belongs to a client/group in the user's facilities
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can read files from attachments bucket
-- Same logic as INSERT policy - check if path starts with valid client_id or group_id
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);






-- ============================================================================
-- Migration: 046_fix_storage_attachments_rls_v3.sql
-- ============================================================================
-- Fix Storage RLS policies for attachments bucket (v3)
-- More reliable approach using direct facility_id check

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to attachments bucket
-- File path format: {client_id}/{filename} or {group_id}/{filename}
-- The policy checks if the first segment (client_id or group_id) belongs to a client/group in the user's facilities
-- Using a more direct approach with explicit type casting
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part(storage.objects.name, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can read files from attachments bucket
-- Same logic as INSERT policy
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part(storage.objects.name, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part(storage.objects.name, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);






-- ============================================================================
-- Migration: 047_fix_post_reactions_rls_insert.sql
-- ============================================================================
-- Fix post_reactions INSERT RLS policy for client posts
-- The issue is that the WITH CHECK clause may not be evaluating correctly
-- We'll use get_user_facility_ids function with a simpler EXISTS clause

-- Drop ALL existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert reactions to posts in their facilities" ON post_reactions;

-- Recreate INSERT policy with simpler EXISTS clause
-- get_user_facility_ids is SECURITY DEFINER, so it bypasses RLS
CREATE POLICY "Users can insert reactions to posts in their facilities"
  ON post_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND (
          -- Group posts: check if group belongs to user's facility
          (
            p.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM groups g
              WHERE g.id = p.group_id
                AND g.deleted = FALSE
                AND g.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            )
          )
          OR
          -- Client posts: check if client belongs to user's facility
          (
            p.client_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM clients c
              WHERE c.id = p.client_id
                AND c.deleted = FALSE
                AND c.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            )
          )
        )
    )
  );



-- ============================================================================
-- Migration: 048_debug_post_reactions_rls.sql
-- ============================================================================
-- Debug and fix post_reactions INSERT RLS policy
-- This migration will help us understand why the policy is failing

-- First, let's check if the function works correctly
-- You can run this query manually to test:
-- SELECT facility_id FROM get_user_facility_ids('929613f4-d754-4902-bfa5-e91e024c60d5');

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reactions to posts in their facilities" ON post_reactions;

-- Create a more explicit policy that directly checks facility membership
-- This avoids potential issues with function calls in WITH CHECK clauses
CREATE POLICY "Users can insert reactions to posts in their facilities"
  ON post_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM posts p
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND (
          -- Group posts: check if group belongs to user's facility
          (
            p.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 
              FROM groups g
              INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
              WHERE g.id = p.group_id
                AND g.deleted = FALSE
                AND ufr.user_id = auth.uid()
                AND ufr.deleted = FALSE
            )
          )
          OR
          -- Client posts: check if client belongs to user's facility
          (
            p.client_id IS NOT NULL
            AND EXISTS (
              SELECT 1 
              FROM clients c
              INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
              WHERE c.id = p.client_id
                AND c.deleted = FALSE
                AND ufr.user_id = auth.uid()
                AND ufr.deleted = FALSE
            )
          )
        )
    )
  );






-- ============================================================================
-- Migration: 049_fix_clients_facility_id.sql
-- ============================================================================
-- Fix clients facility_id mismatch
-- This migration updates clients that belong to the wrong facility
-- to ensure they are associated with the correct facility

-- First, let's identify the issue:
-- Some clients have facility_id = '02d82252-40be-4ad6-98c7-42ecd1841555'
-- but should belong to facility_id = '143731d4-4f02-440e-b84e-7b3e598ceca2'
-- (永富デイサービス(テスト))

-- Update clients to the correct facility
-- Only update if the facility name matches "永富デイサービス(テスト)"
UPDATE clients
SET 
  facility_id = '143731d4-4f02-440e-b84e-7b3e598ceca2'::uuid,
  updated_at = NOW()
WHERE facility_id = '02d82252-40be-4ad6-98c7-42ecd1841555'::uuid
  AND deleted = FALSE
  AND EXISTS (
    SELECT 1 FROM facilities f
    WHERE f.id = '143731d4-4f02-440e-b84e-7b3e598ceca2'::uuid
      AND f.name LIKE '%永富デイサービス%'
      AND f.deleted = FALSE
  );

-- Also update related posts to ensure consistency
UPDATE posts
SET 
  updated_at = NOW()
WHERE client_id IN (
  SELECT id FROM clients
  WHERE facility_id = '143731d4-4f02-440e-b84e-7b3e598ceca2'::uuid
    AND deleted = FALSE
)
AND deleted = FALSE;






-- ============================================================================
-- Migration: 050_diagnose_and_fix_clients_facility.sql
-- ============================================================================
-- Diagnose and fix clients facility_id mismatch
-- This migration will first diagnose the issue, then fix it

-- Step 1: Diagnose - Check current state
-- Run these queries first to understand the situation:

-- 1.1. Check all clients and their facilities
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id as client_facility_id,
  f.name as facility_name,
  c.deleted as client_deleted
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.name;

-- 1.2. Check all users and their facilities
SELECT 
  u.id as user_id,
  u.email,
  u.display_name,
  ufr.facility_id,
  f.name as facility_name,
  ufr.role,
  ufr.deleted as role_deleted
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
WHERE ufr.deleted = FALSE
  AND u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
ORDER BY u.email, f.name;

-- 1.3. Check all facilities
SELECT 
  id,
  name,
  type,
  deleted
FROM facilities
WHERE deleted = FALSE
ORDER BY name;

-- Step 2: Fix - Update clients to match the correct facility
-- Find the facility ID that both users belong to
-- Then update all clients to that facility

-- First, find the common facility ID for both users
DO $$
DECLARE
  target_facility_id UUID;
  old_facility_id UUID;
BEGIN
  -- Find the facility that both users belong to (永富デイサービス(テスト))
  SELECT f.id INTO target_facility_id
  FROM facilities f
  JOIN user_facility_roles ufr1 ON f.id = ufr1.facility_id
  JOIN users u1 ON ufr1.user_id = u1.id
  JOIN user_facility_roles ufr2 ON f.id = ufr2.facility_id
  JOIN users u2 ON ufr2.user_id = u2.id
  WHERE u1.email = 'kanjinagatomi99@gmail.com'
    AND u2.email = 'nivers.nagatomi@gmail.com'
    AND f.name LIKE '%永富デイサービス%'
    AND f.deleted = FALSE
    AND ufr1.deleted = FALSE
    AND ufr2.deleted = FALSE
  LIMIT 1;

  -- If no common facility found, use the facility from the original user
  IF target_facility_id IS NULL THEN
    SELECT ufr.facility_id INTO target_facility_id
    FROM users u
    JOIN user_facility_roles ufr ON u.id = ufr.user_id
    WHERE u.email = 'kanjinagatomi99@gmail.com'
      AND ufr.deleted = FALSE
    LIMIT 1;
  END IF;

  -- Find the old facility ID (where clients currently are)
  SELECT DISTINCT c.facility_id INTO old_facility_id
  FROM clients c
  WHERE c.deleted = FALSE
    AND c.facility_id != target_facility_id
  LIMIT 1;

  -- Update clients to the correct facility
  IF target_facility_id IS NOT NULL AND old_facility_id IS NOT NULL THEN
    UPDATE clients
    SET 
      facility_id = target_facility_id,
      updated_at = NOW()
    WHERE facility_id = old_facility_id
      AND deleted = FALSE;

    RAISE NOTICE 'Updated clients from facility % to facility %', old_facility_id, target_facility_id;
  ELSE
    RAISE NOTICE 'Could not determine facility IDs. target_facility_id: %, old_facility_id: %', target_facility_id, old_facility_id;
  END IF;
END $$;

-- Step 3: Verify - Check the results
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id as client_facility_id,
  f.name as facility_name,
  COUNT(DISTINCT ufr.user_id) as user_count
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
LEFT JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id AND ufr.deleted = FALSE
WHERE c.deleted = FALSE
GROUP BY c.id, c.name, c.facility_id, f.name
ORDER BY c.name;






-- ============================================================================
-- Migration: 051_fix_clients_facility_direct.sql
-- ============================================================================
-- Direct fix for clients facility_id mismatch
-- This migration directly updates clients to the correct facility
-- based on the facility that the original user (kanjinagatomi99@gmail.com) belongs to

-- Step 1: Find the correct facility ID (永富デイサービス(テスト))
-- Get the facility ID from the original user
DO $$
DECLARE
  target_facility_id UUID;
  affected_rows INTEGER;
BEGIN
  -- Find the facility ID that the original user belongs to
  SELECT ufr.facility_id INTO target_facility_id
  FROM users u
  JOIN user_facility_roles ufr ON u.id = ufr.user_id
  JOIN facilities f ON ufr.facility_id = f.id
  WHERE u.email = 'kanjinagatomi99@gmail.com'
    AND f.name LIKE '%永富デイサービス%'
    AND ufr.deleted = FALSE
    AND f.deleted = FALSE
  ORDER BY ufr.created_at ASC
  LIMIT 1;

  -- If found, update all clients to this facility
  IF target_facility_id IS NOT NULL THEN
    -- Update clients that are NOT in the target facility
    UPDATE clients
    SET 
      facility_id = target_facility_id,
      updated_at = NOW()
    WHERE facility_id != target_facility_id
      AND deleted = FALSE;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % clients to facility %', affected_rows, target_facility_id;
  ELSE
    RAISE NOTICE 'Could not find target facility for user kanjinagatomi99@gmail.com';
  END IF;
END $$;



-- ============================================================================
-- Migration: 052_verify_clients_facility_fix.sql
-- ============================================================================
-- Verification queries after fixing clients facility_id
-- Run these queries to verify that the fix worked correctly

-- 1. Check all clients and their facilities
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  f.name as facility_name,
  c.deleted
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.name;

-- 2. Check which users can see which clients
-- This should show that both users can see the same clients
SELECT 
  u.email,
  u.display_name,
  ufr.facility_id as user_facility_id,
  f.name as facility_name,
  COUNT(DISTINCT c.id) as visible_clients_count
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
LEFT JOIN clients c ON c.facility_id = ufr.facility_id AND c.deleted = FALSE
WHERE u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
  AND ufr.deleted = FALSE
GROUP BY u.email, u.display_name, ufr.facility_id, f.name
ORDER BY u.email;

-- 3. Check if both users belong to the same facility
SELECT 
  f.id as facility_id,
  f.name as facility_name,
  COUNT(DISTINCT u.id) as user_count,
  STRING_AGG(DISTINCT u.email, ', ') as user_emails
FROM facilities f
JOIN user_facility_roles ufr ON f.id = ufr.facility_id
JOIN users u ON ufr.user_id = u.id
WHERE u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
  AND ufr.deleted = FALSE
  AND f.deleted = FALSE
GROUP BY f.id, f.name
HAVING COUNT(DISTINCT u.id) = 2;

-- 4. Check clients that should be visible to both users
SELECT 
  c.id,
  c.name,
  c.facility_id,
  f.name as facility_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_facility_roles ufr
      JOIN users u ON ufr.user_id = u.id
      WHERE ufr.facility_id = c.facility_id
        AND u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
        AND ufr.deleted = FALSE
    ) THEN 'Visible to both users'
    ELSE 'NOT visible to both users'
  END as visibility_status
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.name;






-- ============================================================================
-- Migration: 053_check_user_facilities.sql
-- ============================================================================
-- Check all facilities that the original user belongs to
-- This will help identify if there are any unnecessary facility associations

-- 1. Check all facilities for the original user
SELECT 
  u.email,
  u.display_name,
  ufr.facility_id,
  f.name as facility_name,
  f.type as facility_type,
  ufr.role,
  ufr.created_at as joined_at,
  ufr.deleted,
  COUNT(DISTINCT c.id) as clients_count,
  COUNT(DISTINCT g.id) as groups_count
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
LEFT JOIN clients c ON c.facility_id = ufr.facility_id AND c.deleted = FALSE
LEFT JOIN groups g ON g.facility_id = ufr.facility_id AND g.deleted = FALSE
WHERE u.email = 'kanjinagatomi99@gmail.com'
  AND ufr.deleted = FALSE
GROUP BY u.email, u.display_name, ufr.facility_id, f.name, f.type, ufr.role, ufr.created_at, ufr.deleted
ORDER BY ufr.created_at DESC;

-- 2. Check if there are duplicate or unnecessary facility associations
-- (e.g., same facility with different roles or multiple entries)
SELECT 
  u.email,
  ufr.facility_id,
  f.name as facility_name,
  COUNT(*) as role_count,
  STRING_AGG(DISTINCT ufr.role, ', ') as roles,
  STRING_AGG(DISTINCT ufr.id::text, ', ') as role_ids
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
WHERE u.email = 'kanjinagatomi99@gmail.com'
  AND ufr.deleted = FALSE
GROUP BY u.email, ufr.facility_id, f.name
HAVING COUNT(*) > 1
ORDER BY role_count DESC;

-- 3. Check which facility has the clients (永富デイサービス)
SELECT 
  f.id as facility_id,
  f.name as facility_name,
  COUNT(DISTINCT c.id) as clients_count,
  COUNT(DISTINCT ufr.user_id) as users_count,
  STRING_AGG(DISTINCT u.email, ', ') as user_emails
FROM facilities f
LEFT JOIN clients c ON c.facility_id = f.id AND c.deleted = FALSE
LEFT JOIN user_facility_roles ufr ON f.id = ufr.facility_id AND ufr.deleted = FALSE
LEFT JOIN users u ON ufr.user_id = u.id
WHERE f.name LIKE '%永富デイサービス%'
  AND f.deleted = FALSE
GROUP BY f.id, f.name
ORDER BY clients_count DESC;






-- ============================================================================
-- Migration: 054_check_existing_attachments.sql
-- ============================================================================
-- Check existing attachments and their file_url format
-- This will help identify if file_url contains signed URLs or storage paths

SELECT 
  a.id,
  a.post_id,
  a.file_url,
  a.file_name,
  a.file_type,
  a.created_at,
  CASE 
    WHEN a.file_url LIKE 'http://%' OR a.file_url LIKE 'https://%' THEN 'Signed URL (expired)'
    WHEN a.file_url LIKE '%/%' AND NOT (a.file_url LIKE 'http://%' OR a.file_url LIKE 'https://%') THEN 'Storage Path'
    ELSE 'Unknown Format'
  END as url_type,
  -- Extract storage path if it's a signed URL (this is just for reference, we can't reliably extract it)
  CASE 
    WHEN a.file_url LIKE '%/%' AND NOT (a.file_url LIKE 'http://%' OR a.file_url LIKE 'https://%') THEN a.file_url
    ELSE NULL
  END as possible_storage_path
FROM attachments a
WHERE a.deleted = FALSE
ORDER BY a.created_at DESC
LIMIT 20;






-- ============================================================================
-- Migration: 055_fix_attachments_file_url.sql
-- ============================================================================
-- Fix existing attachments: Convert signed URLs to storage paths
-- This migration updates attachments that have signed URLs stored in file_url
-- to use storage paths instead (format: {client_id}/{filename})

-- Step 1: Update attachments that have signed URLs
-- Use client_id and file_name to reconstruct the storage path
UPDATE attachments
SET file_url = client_id::text || '/' || file_name
WHERE (file_url LIKE 'http://%' OR file_url LIKE 'https://%')
  AND client_id IS NOT NULL
  AND file_name IS NOT NULL
  AND deleted = FALSE;

-- Step 2: Verify the update
-- Check how many attachments were updated
SELECT 
  COUNT(*) as updated_count,
  COUNT(CASE WHEN file_url LIKE 'http://%' OR file_url LIKE 'https://%' THEN 1 END) as still_signed_url_count,
  COUNT(CASE WHEN file_url LIKE '%/%' AND NOT (file_url LIKE 'http://%' OR file_url LIKE 'https://%') THEN 1 END) as storage_path_count
FROM attachments
WHERE deleted = FALSE;

-- Step 3: Show sample of updated attachments
SELECT 
  id,
  post_id,
  client_id,
  file_name,
  file_url,
  CASE 
    WHEN file_url LIKE 'http://%' OR file_url LIKE 'https://%' THEN 'Signed URL'
    WHEN file_url LIKE '%/%' AND NOT (file_url LIKE 'http://%' OR file_url LIKE 'https://%') THEN 'Storage Path'
    ELSE 'Unknown'
  END as url_type
FROM attachments
WHERE deleted = FALSE
ORDER BY created_at DESC
LIMIT 10;






-- ============================================================================
-- Migration: 056_debug_storage_upload.sql
-- ============================================================================
-- Debug Storage upload issue
-- This migration adds diagnostic queries to check Storage RLS policies

-- Check if storage.objects table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check existing storage policies for attachments bucket
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%attachments%'
ORDER BY policyname;

-- Test query to check if a client exists and user has access
-- Replace 'd34da20a-5f18-4695-ab5b-396f1f81d4a0' with actual client_id
-- Replace 'ff73cb02-98c0-4139-b972-4c023482e257' with actual user_id
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  ufr.user_id,
  ufr.role,
  ufr.deleted as ufr_deleted,
  c.deleted as client_deleted
FROM clients c
LEFT JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
WHERE c.id = 'd34da20a-5f18-4695-ab5b-396f1f81d4a0'::uuid
  AND ufr.user_id = 'ff73cb02-98c0-4139-b972-4c023482e257'::uuid
  AND ufr.deleted = FALSE
  AND c.deleted = FALSE;






-- ============================================================================
-- Migration: 057_fix_storage_upload_rls.sql
-- ============================================================================
-- Fix Storage RLS policies for attachments bucket
-- Ensure uploads work correctly by simplifying the policy check

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to attachments bucket
-- File path format: {client_id}/{filename} or {group_id}/{filename}
-- Simplified check: verify that the client_id or group_id exists and belongs to user's facility
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can read files from attachments bucket
-- Same logic as INSERT policy
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);






-- ============================================================================
-- Migration: 058_fix_storage_read_rls.sql
-- ============================================================================
-- Fix Storage RLS policies for reading attachments
-- Ensure the SELECT policy correctly evaluates for Server Components

-- Drop existing read policy
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can read files from attachments bucket
-- Simplified and more reliable approach
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    -- Use explicit type casting and ensure the comparison works correctly
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = (split_part((storage.objects.name)::text, '/', 1))
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = (split_part((storage.objects.name)::text, '/', 1))
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);






-- ============================================================================
-- Migration: 059_fix_post_reads_insert_rls.sql
-- ============================================================================
-- Fix post_reads INSERT RLS policy for client posts
-- Use direct JOIN to user_facility_roles for more reliable RLS evaluation
-- Similar to the fix applied to post_reactions INSERT policy

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reads for posts in their facilities" ON post_reads;

-- Recreate INSERT policy with a more explicit and reliable approach
-- Use direct JOIN to user_facility_roles to ensure the policy evaluates correctly
CREATE POLICY "Users can insert reads for posts in their facilities"
  ON post_reads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND (
          -- Group posts
          (
            p.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM groups g
              JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
              WHERE g.id = p.group_id
                AND ufr.user_id = auth.uid()
                AND g.deleted = FALSE
                AND ufr.deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            p.client_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM clients c
              JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
              WHERE c.id = p.client_id
                AND ufr.user_id = auth.uid()
                AND c.deleted = FALSE
                AND ufr.deleted = FALSE
            )
          )
        )
    )
  );






-- ============================================================================
-- Migration: 060_diagnose_post_reads_rls.sql
-- ============================================================================
-- Diagnostic queries for post_reads RLS issues
-- Run these queries to understand why post_reads INSERT might be failing

-- NOTE: All diagnostic queries below are disabled - they're for debugging purposes only
-- Uncomment if you need to run these diagnostic queries

-- 1. Check if the current user can see the posts they're trying to mark as read
-- Replace 'YOUR_USER_ID' and 'YOUR_POST_ID' with actual values from the error
-- SELECT 
--   p.id as post_id,
--   p.client_id,
--   p.group_id,
--   c.name as client_name,
--   c.facility_id as client_facility_id,
--   g.name as group_name,
--   g.facility_id as group_facility_id,
--   CASE 
--     WHEN p.client_id IS NOT NULL THEN 'client'
--     WHEN p.group_id IS NOT NULL THEN 'group'
--     ELSE 'unknown'
--   END as post_type,
--   -- Check if user belongs to the facility
--   EXISTS (
--     SELECT 1 FROM user_facility_roles ufr
--     WHERE ufr.user_id = auth.uid()
--       AND ufr.deleted = FALSE
--       AND (
--         (p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id)
--         OR
--         (p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id)
--       )
--   ) as user_can_access_post
-- FROM posts p
-- LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
-- LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
-- WHERE p.deleted = FALSE
--   AND p.id IN (
--     -- Replace with actual post IDs from the error
--     SELECT id FROM posts WHERE deleted = FALSE ORDER BY created_at DESC LIMIT 10
--   );

-- 2. Check user's facility memberships
-- SELECT 
--   u.id as user_id,
--   u.email,
--   ufr.facility_id,
--   f.name as facility_name,
--   ufr.role,
--   ufr.deleted
-- FROM users u
-- JOIN user_facility_roles ufr ON u.id = ufr.user_id
-- JOIN facilities f ON ufr.facility_id = f.id
-- WHERE u.id = auth.uid()
--   AND ufr.deleted = FALSE
-- ORDER BY f.name;

-- 3. Check recent posts and their facility associations
-- SELECT 
--   p.id as post_id,
--   p.client_id,
--   p.group_id,
--   p.created_at,
--   CASE 
--     WHEN p.client_id IS NOT NULL THEN c.name
--     WHEN p.group_id IS NOT NULL THEN g.name
--     ELSE 'Unknown'
--   END as post_target_name,
--   CASE 
--     WHEN p.client_id IS NOT NULL THEN c.facility_id
--     WHEN p.group_id IS NOT NULL THEN g.facility_id
--     ELSE NULL
--   END as post_facility_id,
--   -- Check if current user can access this post
--   EXISTS (
--     SELECT 1 FROM user_facility_roles ufr
--     WHERE ufr.user_id = auth.uid()
--       AND ufr.deleted = FALSE
--       AND ufr.facility_id = COALESCE(c.facility_id, g.facility_id)
--   ) as user_can_access
-- FROM posts p
-- LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
-- LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
-- WHERE p.deleted = FALSE
-- ORDER BY p.created_at DESC
-- LIMIT 20;

-- 4. Check existing post_reads records for the current user
-- SELECT 
--   pr.id,
--   pr.post_id,
--   pr.user_id,
--   pr.read_at,
--   p.client_id,
--   p.group_id,
--   CASE 
--     WHEN p.client_id IS NOT NULL THEN c.name
--     WHEN p.group_id IS NOT NULL THEN g.name
--     ELSE 'Unknown'
--   END as post_target_name
-- FROM post_reads pr
-- JOIN posts p ON pr.post_id = p.id
-- LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
-- LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
-- WHERE pr.user_id = auth.uid()
--   AND p.deleted = FALSE
-- ORDER BY pr.read_at DESC
-- LIMIT 20;






-- ============================================================================
-- Migration: 061_simplify_post_reads_insert_rls.sql
-- ============================================================================
-- Simplify post_reads INSERT RLS policy for better reliability
-- Use a single EXISTS clause with direct facility_id check instead of nested EXISTS

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reads for posts in their facilities" ON post_reads;

-- Recreate INSERT policy with a simpler, more direct approach
-- This policy checks if the post belongs to a facility the user is a member of
CREATE POLICY "Users can insert reads for posts in their facilities"
  ON post_reads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM posts p
      LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
      LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
      JOIN user_facility_roles ufr ON (
        (p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id)
        OR
        (p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id)
      )
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
    )
  );






-- ============================================================================
-- Migration: 062_diagnose_post_reads_insert_issue.sql
-- ============================================================================
-- Diagnostic query to check why post_reads INSERT might be failing
-- Run this query to see if the RLS policy conditions are met for a specific post

-- Replace 'YOUR_POST_ID' with the actual post ID from the error
-- Replace 'YOUR_USER_ID' with the actual user ID (or use auth.uid() if running as the user)

-- NOTE: The following diagnostic query is disabled because it contains placeholders
-- To use this query, uncomment it and replace 'YOUR_POST_ID' with an actual post ID
-- -- Check if a specific post can be marked as read by the current user
-- SELECT 
--   p.id as post_id,
--   p.client_id,
--   p.group_id,
--   p.deleted as post_deleted,
--   CASE 
--     WHEN p.client_id IS NOT NULL THEN 'client'
--     WHEN p.group_id IS NOT NULL THEN 'group'
--     ELSE 'unknown'
--   END as post_type,
--   -- Client post details
--   c.id as client_id_from_join,
--   c.facility_id as client_facility_id,
--   c.deleted as client_deleted,
--   -- Group post details
--   g.id as group_id_from_join,
--   g.facility_id as group_facility_id,
--   g.deleted as group_deleted,
--   -- User facility role
--   ufr.facility_id as user_facility_id,
--   ufr.user_id as user_id_from_ufr,
--   ufr.deleted as ufr_deleted,
--   -- RLS policy check result
--   CASE 
--     WHEN p.deleted = TRUE THEN 'Post is deleted'
--     WHEN p.client_id IS NOT NULL AND c.id IS NULL THEN 'Client not found or deleted'
--     WHEN p.group_id IS NOT NULL AND g.id IS NULL THEN 'Group not found or deleted'
--     WHEN p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id AND ufr.user_id = auth.uid() AND ufr.deleted = FALSE THEN 'RLS check PASSED (client post)'
--     WHEN p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id AND ufr.user_id = auth.uid() AND ufr.deleted = FALSE THEN 'RLS check PASSED (group post)'
--     ELSE 'RLS check FAILED'
--   END as rls_check_result
-- FROM posts p
-- LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
-- LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
-- LEFT JOIN user_facility_roles ufr ON (
--   (p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id)
--   OR
--   (p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id)
-- )
-- WHERE p.id = 'YOUR_POST_ID'  -- Replace with actual post ID
--   AND ufr.user_id = auth.uid()  -- Or replace with actual user ID
-- ORDER BY ufr.facility_id;

-- Alternative: Check all recent posts and their RLS eligibility
-- NOTE: This diagnostic query is disabled - it's for debugging purposes only
-- Uncomment if you need to run this diagnostic query
-- SELECT 
--   p.id as post_id,
--   p.created_at,
--   CASE 
--     WHEN p.client_id IS NOT NULL THEN c.name
--     WHEN p.group_id IS NOT NULL THEN g.name
--     ELSE 'Unknown'
--   END as post_target_name,
--   CASE 
--     WHEN p.client_id IS NOT NULL THEN c.facility_id
--     WHEN p.group_id IS NOT NULL THEN g.facility_id
--     ELSE NULL
--   END as post_facility_id,
--   -- Check if current user can mark this post as read
--   EXISTS (
--     SELECT 1 
--     FROM posts p2
--     LEFT JOIN clients c2 ON p2.client_id = c2.id AND c2.deleted = FALSE
--     LEFT JOIN groups g2 ON p2.group_id = g2.id AND g2.deleted = FALSE
--     JOIN user_facility_roles ufr2 ON (
--       (p2.client_id IS NOT NULL AND ufr2.facility_id = c2.facility_id)
--       OR
--       (p2.group_id IS NOT NULL AND ufr2.facility_id = g2.facility_id)
--     )
--     WHERE p2.id = p.id
--       AND p2.deleted = FALSE
--       AND ufr2.user_id = auth.uid()
--       AND ufr2.deleted = FALSE
--   ) as can_mark_as_read
-- FROM posts p
-- LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
-- LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
-- WHERE p.deleted = FALSE
--   AND (p.client_id IS NOT NULL OR p.group_id IS NOT NULL)
-- ORDER BY p.created_at DESC
-- LIMIT 20;






-- ============================================================================
-- Migration: 063_diagnose_storage_access.sql
-- ============================================================================
-- Diagnostic queries for Storage access issues
-- Run these queries to understand why Storage signed URLs might be failing

-- 1. Check if files exist in Storage for a specific client
-- NOTE: The following diagnostic query is disabled because it contains placeholders
-- To use this query, uncomment it and replace 'YOUR_CLIENT_ID' with an actual client ID
-- -- Replace 'YOUR_CLIENT_ID' with the actual client ID
-- SELECT 
--   name,
--   id,
--   created_at,
--   updated_at,
--   last_accessed_at,
--   metadata
-- FROM storage.objects
-- WHERE bucket_id = 'attachments'
--   AND name LIKE 'YOUR_CLIENT_ID/%'  -- Replace with actual client ID
-- ORDER BY created_at DESC
-- LIMIT 20;

-- 2. Check Storage RLS policies for attachments bucket
-- NOTE: This diagnostic query is disabled - it's for debugging purposes only
-- Uncomment if you need to run this diagnostic query
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'objects'
--   AND schemaname = 'storage'
-- ORDER BY policyname;

-- 3. Check if current user can access files in Storage
-- NOTE: The following diagnostic query is disabled because it contains placeholders
-- To use this query, uncomment it and replace 'YOUR_CLIENT_ID' with an actual client ID
-- -- This query simulates the RLS policy check
-- SELECT 
--   o.name as file_path,
--   o.bucket_id,
--   o.created_at,
--   -- Check if path starts with a valid client_id from user's facility
--   EXISTS (
--     SELECT 1 
--     FROM clients c
--     INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
--     WHERE c.id::text = split_part(o.name, '/', 1)
--       AND ufr.user_id = auth.uid()
--       AND ufr.deleted = FALSE
--       AND c.deleted = FALSE
--   ) as can_access_via_client,
--   -- Check if path starts with a valid group_id from user's facility
--   EXISTS (
--     SELECT 1 
--     FROM groups g
--     INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
--     WHERE g.id::text = split_part(o.name, '/', 1)
--       AND ufr.user_id = auth.uid()
--       AND ufr.deleted = FALSE
--       AND g.deleted = FALSE
--   ) as can_access_via_group
-- FROM storage.objects o
-- WHERE o.bucket_id = 'attachments'
--   AND o.name LIKE 'YOUR_CLIENT_ID/%'  -- Replace with actual client ID
-- ORDER BY o.created_at DESC
-- LIMIT 10;

-- 4. Check user's facility memberships
-- NOTE: This diagnostic query is disabled - it's for debugging purposes only
-- Uncomment if you need to run this diagnostic query
-- SELECT 
--   u.id as user_id,
--   u.email,
--   ufr.facility_id,
--   f.name as facility_name,
--   ufr.role,
--   ufr.deleted
-- FROM users u
-- JOIN user_facility_roles ufr ON u.id = ufr.user_id
-- JOIN facilities f ON ufr.facility_id = f.id
-- WHERE u.id = auth.uid()
--   AND ufr.deleted = FALSE
-- ORDER BY f.name;

-- 5. Check clients and their facilities
-- NOTE: This diagnostic query is disabled - it's for debugging purposes only
-- Uncomment if you need to run this diagnostic query
-- SELECT 
--   c.id as client_id,
--   c.name as client_name,
--   c.facility_id,
--   f.name as facility_name,
--   c.deleted
-- FROM clients c
-- LEFT JOIN facilities f ON c.facility_id = f.id
-- WHERE c.deleted = FALSE
-- ORDER BY c.name;






-- ============================================================================
-- Migration: 064_fix_post_reactions_select_rls.sql
-- ============================================================================
-- Fix post_reactions SELECT RLS policy to ensure facility isolation
-- The issue: Other accounts' likes are being reflected in different accounts
-- This happens when the RLS policy doesn't properly filter by facility

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view reactions to posts in their facilities" ON post_reactions;

-- Recreate SELECT policy with direct facility checks (more reliable)
CREATE POLICY "Users can view reactions to posts in their facilities"
  ON post_reactions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND post_id IN (
      SELECT p.id 
      FROM posts p
      LEFT JOIN groups g ON p.group_id = g.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.deleted = FALSE
        AND (
          -- Group posts: check via groups table
          (
            p.group_id IS NOT NULL
            AND g.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND g.deleted = FALSE
          )
          OR
          -- Client posts: check via clients table
          (
            p.client_id IS NOT NULL
            AND c.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND c.deleted = FALSE
          )
        )
    )
  );




