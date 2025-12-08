-- Debug Storage upload issue
-- This migration adds diagnostic queries to check Storage RLS policies

-- Check if storage.objects table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check existing storage policies for attachments bucket
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%attachments%'
ORDER BY policyname;

-- Test query to check if a client exists and user has access
-- Replace 'd34da20a-5f18-4695-ab5b-396f1f81d4a0' with actual client_id
-- Replace 'ff73cb02-98c0-4139-b972-4c023482e257' with actual user_id
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  ufr.user_id,
  ufr.role,
  ufr.deleted as ufr_deleted,
  c.deleted as client_deleted
FROM clients c
LEFT JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
WHERE c.id = 'd34da20a-5f18-4695-ab5b-396f1f81d4a0'::uuid
  AND ufr.user_id = 'ff73cb02-98c0-4139-b972-4c023482e257'::uuid
  AND ufr.deleted = FALSE
  AND c.deleted = FALSE;



