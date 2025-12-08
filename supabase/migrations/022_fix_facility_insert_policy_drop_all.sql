-- Fix facilities INSERT policy: Drop ALL existing policies first, then recreate
-- This ensures we start with a clean slate

-- Drop ALL existing INSERT policies on facilities table
-- We'll drop them by name to be safe, but also use a more comprehensive approach
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;
DROP POLICY IF EXISTS "Anon users with valid JWT can create facilities" ON facilities;
DROP POLICY IF EXISTS "facilities_insert_by_authenticated" ON facilities;
DROP POLICY IF EXISTS "facilities_insert_by_owner" ON facilities;

-- Also drop any policies that might have been created with different names
-- This will drop ALL INSERT policies on facilities table
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
    END LOOP;
END $$;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS check_user_authenticated();

-- Now create the policies we want
-- Policy for anon role (used by createBrowserClient)
CREATE POLICY "Anon users with valid JWT can create facilities"
  ON facilities FOR INSERT
  TO anon
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for authenticated role (for completeness)
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);











