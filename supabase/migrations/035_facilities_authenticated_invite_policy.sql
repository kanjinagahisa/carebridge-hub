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





