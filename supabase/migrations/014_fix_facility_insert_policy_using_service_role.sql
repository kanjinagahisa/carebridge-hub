-- Final fix: Use a different approach for facilities INSERT policy
-- The issue is that PostgREST may not be evaluating auth.uid() correctly
-- even when Authorization header is present with anon key
-- 
-- Solution: Create a policy that explicitly checks for authenticated role
-- and uses a more explicit auth.uid() check

-- Drop all existing INSERT policies on facilities
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;

-- Create a new policy that explicitly allows authenticated users
-- This policy will be evaluated for both anon and authenticated roles
-- but WITH CHECK ensures only authenticated users (with valid JWT) can insert
CREATE POLICY "Allow authenticated users to create facilities"
  ON facilities FOR INSERT
  WITH CHECK (
    -- Explicitly check if user is authenticated by verifying auth.uid() is not null
    -- This should work even with anon key when Authorization header is present
    auth.uid() IS NOT NULL
  );











