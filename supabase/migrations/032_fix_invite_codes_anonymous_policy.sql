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





