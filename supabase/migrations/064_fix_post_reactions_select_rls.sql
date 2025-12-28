-- Fix post_reactions SELECT RLS policy to ensure facility isolation
-- The issue: Other accounts' likes are being reflected in different accounts
-- This happens when the RLS policy doesn't properly filter by facility

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view reactions to posts in their facilities" ON post_reactions;

-- Recreate SELECT policy with direct facility checks (more reliable)
CREATE POLICY "Users can view reactions to posts in their facilities"
  ON post_reactions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND post_id IN (
      SELECT p.id 
      FROM posts p
      LEFT JOIN groups g ON p.group_id = g.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.deleted = FALSE
        AND (
          -- Group posts: check via groups table
          (
            p.group_id IS NOT NULL
            AND g.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND g.deleted = FALSE
          )
          OR
          -- Client posts: check via clients table
          (
            p.client_id IS NOT NULL
            AND c.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
            AND c.deleted = FALSE
          )
        )
    )
  );



