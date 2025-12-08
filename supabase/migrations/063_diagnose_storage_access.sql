-- Diagnostic queries for Storage access issues
-- Run these queries to understand why Storage signed URLs might be failing

-- 1. Check if files exist in Storage for a specific client
-- Replace 'YOUR_CLIENT_ID' with the actual client ID
SELECT 
  name,
  id,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'attachments'
  AND name LIKE 'YOUR_CLIENT_ID/%'  -- Replace with actual client ID
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check Storage RLS policies for attachments bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- 3. Check if current user can access files in Storage
-- This query simulates the RLS policy check
SELECT 
  o.name as file_path,
  o.bucket_id,
  o.created_at,
  -- Check if path starts with a valid client_id from user's facility
  EXISTS (
    SELECT 1 
    FROM clients c
    INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
    WHERE c.id::text = split_part(o.name, '/', 1)
      AND ufr.user_id = auth.uid()
      AND ufr.deleted = FALSE
      AND c.deleted = FALSE
  ) as can_access_via_client,
  -- Check if path starts with a valid group_id from user's facility
  EXISTS (
    SELECT 1 
    FROM groups g
    INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
    WHERE g.id::text = split_part(o.name, '/', 1)
      AND ufr.user_id = auth.uid()
      AND ufr.deleted = FALSE
      AND g.deleted = FALSE
  ) as can_access_via_group
FROM storage.objects o
WHERE o.bucket_id = 'attachments'
  AND o.name LIKE 'YOUR_CLIENT_ID/%'  -- Replace with actual client ID
ORDER BY o.created_at DESC
LIMIT 10;

-- 4. Check user's facility memberships
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

-- 5. Check clients and their facilities
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  f.name as facility_name,
  c.deleted
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.name;



