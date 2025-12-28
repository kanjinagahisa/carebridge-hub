-- Fix facilities INSERT policy: Remove TO authenticated to allow anon role requests
-- The issue is that createBrowserClient uses anon key, so requests are sent as anon role
-- Even with auth token, TO authenticated prevents the policy from being evaluated
-- By removing TO authenticated and keeping WITH CHECK (auth.uid() IS NOT NULL),
-- the policy will be evaluated for anon role requests, and auth.uid() will be
-- correctly evaluated when an auth token is present in the Authorization header

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;

-- Recreate the policy without TO authenticated
-- This allows anon role requests to be evaluated, but auth.uid() IS NOT NULL
-- ensures only authenticated users (with valid auth token) can insert
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);












