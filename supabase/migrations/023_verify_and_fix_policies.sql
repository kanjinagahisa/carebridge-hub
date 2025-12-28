-- Verify current RLS policies and fix if needed
-- This migration will check the current state and ensure correct policies are in place

-- Step 1: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'facilities';

-- Step 2: List all existing INSERT policies for facilities
SELECT 
  policyname,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'facilities'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 3: Drop ALL existing INSERT policies (to start fresh)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'facilities' 
          AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON facilities', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 4: Verify permissions for anon and authenticated roles
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- Step 5: Ensure permissions are granted
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON TABLE facilities TO anon;
GRANT SELECT ON TABLE facilities TO anon;
GRANT INSERT ON TABLE facilities TO authenticated;
GRANT SELECT ON TABLE facilities TO authenticated;

-- Step 6: Create the correct policies
-- Policy for anon role (used by createBrowserClient with anon key)
CREATE POLICY "Anon users with valid JWT can create facilities"
  ON facilities FOR INSERT
  TO anon
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for authenticated role (for completeness)
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 7: Verify the policies were created
SELECT 
  policyname,
  roles,
  cmd as command,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'facilities'
  AND cmd = 'INSERT'
ORDER BY policyname;












