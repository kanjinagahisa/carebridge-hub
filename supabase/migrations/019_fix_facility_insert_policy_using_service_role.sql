-- Final fix: Try using a function-based approach to check authentication
-- The issue is that PostgREST may not be evaluating auth.uid() correctly
-- even when Authorization header is present with anon key
-- 
-- Solution: Create a SECURITY DEFINER function that explicitly checks auth.uid()
-- and use it in the RLS policy

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;

-- Create a function to check if user is authenticated
-- SECURITY DEFINER ensures it runs with elevated privileges
CREATE OR REPLACE FUNCTION check_user_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  -- Explicitly check if auth.uid() is not null
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy using the function
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (check_user_authenticated());












