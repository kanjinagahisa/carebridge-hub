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





