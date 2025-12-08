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





