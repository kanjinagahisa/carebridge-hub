-- Fix: Grant proper permissions and recreate RLS policy
-- The issue may be that authenticated role doesn't have INSERT permission
-- on the facilities table, even though RLS policy exists

-- Grant usage on public schema to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant INSERT permission on facilities table to authenticated role
GRANT INSERT ON TABLE facilities TO authenticated;

-- Also grant SELECT permission (needed for .select() after insert)
GRANT SELECT ON TABLE facilities TO authenticated;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;
DROP POLICY IF EXISTS "Debug: Allow all authenticated inserts" ON facilities;
DROP POLICY IF EXISTS "Allow authenticated users to create facilities" ON facilities;

-- Recreate the proper INSERT policy
-- This policy allows authenticated users (with valid JWT) to insert facilities
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);












