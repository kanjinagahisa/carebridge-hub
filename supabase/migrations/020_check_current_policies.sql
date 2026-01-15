-- Check current RLS policies for facilities table
-- This will help us understand what policies are currently active

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'facilities';

-- 2. Get all INSERT policies for facilities table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'facilities'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 3. Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 4. Check if check_user_authenticated function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'check_user_authenticated';












