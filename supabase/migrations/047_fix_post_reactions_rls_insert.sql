-- Fix post_reactions INSERT RLS policy for client posts
-- The issue is that the WITH CHECK clause may not be evaluating correctly
-- We'll use get_user_facility_ids function with a simpler EXISTS clause

-- Drop ALL existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert reactions to posts in their facilities" ON post_reactions;

-- Recreate INSERT policy with simpler EXISTS clause
-- get_user_facility_ids is SECURITY DEFINER, so it bypasses RLS
CREATE POLICY "Users can insert reactions to posts in their facilities"
  ON post_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND (
          -- Group posts: check if group belongs to user's facility
          (
            p.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM groups g
              WHERE g.id = p.group_id
                AND g.deleted = FALSE
                AND g.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            )
          )
          OR
          -- Client posts: check if client belongs to user's facility
          (
            p.client_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM clients c
              WHERE c.id = p.client_id
                AND c.deleted = FALSE
                AND c.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            )
          )
        )
    )
  );

