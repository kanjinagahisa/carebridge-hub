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





