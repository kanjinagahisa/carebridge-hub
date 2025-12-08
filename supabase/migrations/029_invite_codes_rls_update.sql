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

