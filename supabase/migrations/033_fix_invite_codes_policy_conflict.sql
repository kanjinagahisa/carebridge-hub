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






