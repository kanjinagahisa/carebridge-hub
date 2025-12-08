-- Simplify post_reads INSERT RLS policy for better reliability
-- Use a single EXISTS clause with direct facility_id check instead of nested EXISTS

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reads for posts in their facilities" ON post_reads;

-- Recreate INSERT policy with a simpler, more direct approach
-- This policy checks if the post belongs to a facility the user is a member of
CREATE POLICY "Users can insert reads for posts in their facilities"
  ON post_reads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM posts p
      LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
      LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
      JOIN user_facility_roles ufr ON (
        (p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id)
        OR
        (p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id)
      )
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
    )
  );



