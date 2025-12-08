-- Check RLS status and policy details for facilities table
-- This will show if RLS is enabled and the exact policy definitions

-- 1. Check if RLS is enabled for facilities table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'facilities';

-- 2. Get all INSERT policies for facilities table with full details
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
WHERE schemaname = 'public'
  AND tablename = 'facilities'
  AND cmd = 'INSERT';

-- 3. Get all policies for facilities table (to see if there are multiple INSERT policies)
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'facilities'
ORDER BY cmd, policyname;


