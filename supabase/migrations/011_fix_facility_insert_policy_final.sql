-- Fix facilities INSERT policy to work correctly with authenticated users
-- The issue is that without TO authenticated, the policy is evaluated for anon role
-- which may not have the auth context properly set

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;

-- Recreate the policy with TO authenticated
-- This ensures the policy only applies to authenticated role requests
-- Supabase client with auth token will automatically use authenticated role
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);












