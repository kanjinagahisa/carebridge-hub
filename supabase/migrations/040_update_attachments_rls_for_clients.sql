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






