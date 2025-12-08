-- Diagnostic queries for post_reads RLS issues
-- Run these queries to understand why post_reads INSERT might be failing

-- 1. Check if the current user can see the posts they're trying to mark as read
-- Replace 'YOUR_USER_ID' and 'YOUR_POST_ID' with actual values from the error
SELECT 
  p.id as post_id,
  p.client_id,
  p.group_id,
  c.name as client_name,
  c.facility_id as client_facility_id,
  g.name as group_name,
  g.facility_id as group_facility_id,
  CASE 
    WHEN p.client_id IS NOT NULL THEN 'client'
    WHEN p.group_id IS NOT NULL THEN 'group'
    ELSE 'unknown'
  END as post_type,
  -- Check if user belongs to the facility
  EXISTS (
    SELECT 1 FROM user_facility_roles ufr
    WHERE ufr.user_id = auth.uid()
      AND ufr.deleted = FALSE
      AND (
        (p.client_id IS NOT NULL AND ufr.facility_id = c.facility_id)
        OR
        (p.group_id IS NOT NULL AND ufr.facility_id = g.facility_id)
      )
  ) as user_can_access_post
FROM posts p
LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
WHERE p.deleted = FALSE
  AND p.id IN (
    -- Replace with actual post IDs from the error
    SELECT id FROM posts WHERE deleted = FALSE ORDER BY created_at DESC LIMIT 10
  );

-- 2. Check user's facility memberships
SELECT 
  u.id as user_id,
  u.email,
  ufr.facility_id,
  f.name as facility_name,
  ufr.role,
  ufr.deleted
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
WHERE u.id = auth.uid()
  AND ufr.deleted = FALSE
ORDER BY f.name;

-- 3. Check recent posts and their facility associations
SELECT 
  p.id as post_id,
  p.client_id,
  p.group_id,
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
  -- Check if current user can access this post
  EXISTS (
    SELECT 1 FROM user_facility_roles ufr
    WHERE ufr.user_id = auth.uid()
      AND ufr.deleted = FALSE
      AND ufr.facility_id = COALESCE(c.facility_id, g.facility_id)
  ) as user_can_access
FROM posts p
LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
WHERE p.deleted = FALSE
ORDER BY p.created_at DESC
LIMIT 20;

-- 4. Check existing post_reads records for the current user
SELECT 
  pr.id,
  pr.post_id,
  pr.user_id,
  pr.read_at,
  p.client_id,
  p.group_id,
  CASE 
    WHEN p.client_id IS NOT NULL THEN c.name
    WHEN p.group_id IS NOT NULL THEN g.name
    ELSE 'Unknown'
  END as post_target_name
FROM post_reads pr
JOIN posts p ON pr.post_id = p.id
LEFT JOIN clients c ON p.client_id = c.id AND c.deleted = FALSE
LEFT JOIN groups g ON p.group_id = g.id AND g.deleted = FALSE
WHERE pr.user_id = auth.uid()
  AND p.deleted = FALSE
ORDER BY pr.read_at DESC
LIMIT 20;



