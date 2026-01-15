-- Debug and fix post_reactions INSERT RLS policy
-- This migration will help us understand why the policy is failing

-- First, let's check if the function works correctly
-- You can run this query manually to test:
-- SELECT facility_id FROM get_user_facility_ids('929613f4-d754-4902-bfa5-e91e024c60d5');

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert reactions to posts in their facilities" ON post_reactions;

-- Create a more explicit policy that directly checks facility membership
-- This avoids potential issues with function calls in WITH CHECK clauses
CREATE POLICY "Users can insert reactions to posts in their facilities"
  ON post_reactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM posts p
      WHERE p.id = post_id
        AND p.deleted = FALSE
        AND (
          -- Group posts: check if group belongs to user's facility
          (
            p.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 
              FROM groups g
              INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
              WHERE g.id = p.group_id
                AND g.deleted = FALSE
                AND ufr.user_id = auth.uid()
                AND ufr.deleted = FALSE
            )
          )
          OR
          -- Client posts: check if client belongs to user's facility
          (
            p.client_id IS NOT NULL
            AND EXISTS (
              SELECT 1 
              FROM clients c
              INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
              WHERE c.id = p.client_id
                AND c.deleted = FALSE
                AND ufr.user_id = auth.uid()
                AND ufr.deleted = FALSE
            )
          )
        )
    )
  );




