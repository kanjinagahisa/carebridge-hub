-- Diagnostic query to check why post_reads INSERT might be failing
-- Run this query to see if the RLS policy conditions are met for a specific post

-- Replace 'YOUR_POST_ID' with the actual post ID from the error
-- Replace 'YOUR_USER_ID' with the actual user ID (or use auth.uid() if running as the user)

-- Check if a specific post can be marked as read by the current user
SELECT 
  p.id as post_id,
  p.client_id,
  p.group_id,
  p.deleted as post_deleted,
  CASE 
    WHEN p.client_id IS NOT NULL THEN 'client'
    WHEN p.group_id IS NOT NULL THEN 'group'
    ELSE 'unknown'
  END as post_type,
  -- Client post details
  c.id as client_id_from_join,
  c.facility_id as client_facility_id,
  c.deleted as client_deleted,
  -- Group post details
  g.id as group_id_from_join,
  g.facility_id as group_facility_id,
  g.deleted as group_deleted,
  -- User facility role
  ufr.facility_id as user_facility_id,
  ufr.user_id as user_id_from_ufr,
  ufr.deleted as ufr_deleted,
  -- RLS policy check result
  CASE 
    WHEN p.deleted = TRUE THEN 'Post is deleted'
    WHEN p.client_id IS NOT NULL AND c.id IS NULL THEN 'Client not found or deleted'
    WHEN p.group_id IS NOT NULL AND g.id IS NULL THEN 'Group not found or deleted'
    WHEN p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id AND ufr.user_id = auth.uid() AND ufr.deleted = FALSE THEN 'RLS check PASSED (client post)'
    WHEN p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id AND ufr.user_id = auth.uid() AND ufr.deleted = FALSE THEN 'RLS check PASSED (group post)'
    ELSE 'RLS check FAILED'
  END as rls_check_result
FROM posts p
LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
LEFT JOIN user_facility_roles ufr ON (
  (p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id)
  OR
  (p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id)
)
WHERE p.id = 'YOUR_POST_ID'  -- Replace with actual post ID
  AND ufr.user_id = auth.uid()  -- Or replace with actual user ID
ORDER BY ufr.facility_id;

-- Alternative: Check all recent posts and their RLS eligibility
SELECT 
  p.id as post_id,
  p.created_at,
  CASE 
    WHEN p.client_id IS NOT NULL THEN c.name
    WHEN p.group_id IS NOT NULL THEN g.name
    ELSE 'Unknown'
  END as post_target_name,
  CASE 
    WHEN p.client_id IS NOT NULL THEN c.facility_id
    WHEN p.group_id IS NOT NULL THEN g.facility_id
    ELSE NULL
  END as post_facility_id,
  -- Check if current user can mark this post as read
  EXISTS (
    SELECT 1 
    FROM posts p2
    LEFT JOIN clients c2 ON p2.client_id = c2.id AND c2.deleted = FALSE
    LEFT JOIN groups g2 ON p2.group_id = g2.id AND g2.deleted = FALSE
    JOIN user_facility_roles ufr2 ON (
      (p2.client_id IS NOT NULL AND ufr2.facility_id = c2.facility_id)
      OR
      (p2.group_id IS NOT NULL AND ufr2.facility_id = g2.facility_id)
    )
    WHERE p2.id = p.id
      AND p2.deleted = FALSE
      AND ufr2.user_id = auth.uid()
      AND ufr2.deleted = FALSE
  ) as can_mark_as_read
FROM posts p
LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
WHERE p.deleted = FALSE
  AND (p.client_id IS NOT NULL OR p.group_id IS NOT NULL)
ORDER BY p.created_at DESC
LIMIT 20;




