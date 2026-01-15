-- Fix facilities INSERT policy to work with anon role
-- createBrowserClient uses anon key, so requests are sent as anon role
-- However, when Authorization header contains a valid JWT token,
-- PostgREST should still evaluate auth.uid() correctly
-- 
-- Solution: Create a policy that applies to anon role
-- and checks auth.uid() IS NOT NULL

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;

-- Drop the function if it exists (we'll use a simpler approach)
DROP FUNCTION IF EXISTS check_user_authenticated();

-- Create a policy that applies to anon role
-- This allows requests from createBrowserClient (which uses anon key)
-- but still enforces that auth.uid() IS NOT NULL (which requires a valid JWT)
CREATE POLICY "Anon users with valid JWT can create facilities"
  ON facilities FOR INSERT
  TO anon
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also create a policy for authenticated role (for completeness)
-- This covers cases where the request is sent with authenticated role
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);












