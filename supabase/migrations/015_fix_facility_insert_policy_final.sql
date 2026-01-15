-- Final fix: Disable RLS temporarily to test, then re-enable with correct policy
-- The issue is that PostgREST may not be evaluating JWT tokens correctly
-- even when Authorization header is present

-- First, let's check if RLS is the issue by temporarily disabling it
-- NOTE: This is for debugging only - we will re-enable it immediately after

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;

-- Temporarily disable RLS to test if the issue is with RLS evaluation
-- ALTER TABLE facilities DISABLE ROW LEVEL SECURITY;

-- Actually, let's try a different approach: Use a function-based policy
-- that explicitly checks the JWT token

-- Create a function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy using the function
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (is_authenticated_user());












