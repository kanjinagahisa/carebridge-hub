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







