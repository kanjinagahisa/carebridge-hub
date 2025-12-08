-- First, drop ALL existing INSERT policies on facilities table
-- This ensures we start with a clean slate
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;

-- Verify no INSERT policies exist (this will show empty result if successful)
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'facilities' AND cmd = 'INSERT';

-- Recreate the policy with a more explicit check
-- Using auth.uid() IS NOT NULL is correct, but we'll also ensure it's properly formatted
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the new policy was created correctly
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE tablename = 'facilities' AND cmd = 'INSERT';


