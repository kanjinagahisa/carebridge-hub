-- Fix post_reads INSERT RLS policy for client posts
-- Use direct JOIN to user_facility_roles for more reliable RLS evaluation
-- Similar to the fix applied to post_reactions INSERT policy

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reads for posts in their facilities" ON post_reads;

-- Recreate INSERT policy with a more explicit and reliable approach
-- Use direct JOIN to user_facility_roles to ensure the policy evaluates correctly
CREATE POLICY "Users can insert reads for posts in their facilities"
  ON post_reads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND (
          -- Group posts
          (
            p.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM groups g
              JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
              WHERE g.id = p.group_id
                AND ufr.user_id = auth.uid()
                AND g.deleted = FALSE
                AND ufr.deleted = FALSE
            )
          )
          OR
          -- Client posts
          (
            p.client_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM clients c
              JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
              WHERE c.id = p.client_id
                AND ufr.user_id = auth.uid()
                AND c.deleted = FALSE
                AND ufr.deleted = FALSE
            )
          )
        )
    )
  );




