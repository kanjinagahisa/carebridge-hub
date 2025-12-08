-- Drop the existing policy that uses TO authenticated
-- This might be blocking requests from the anon role
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;

-- Recreate the policy without TO authenticated
-- Supabase client uses anon key, so we should allow both anon and authenticated roles
-- The WITH CHECK clause will ensure only authenticated users can insert
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the new policy was created correctly
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE tablename = 'facilities' AND cmd = 'INSERT';


