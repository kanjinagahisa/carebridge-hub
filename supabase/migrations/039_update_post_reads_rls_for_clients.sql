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





