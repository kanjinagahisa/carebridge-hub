-- Drop the existing policy that uses auth.role()
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;

-- Create a new policy using auth.uid() IS NOT NULL instead
-- This is more reliable for checking if a user is authenticated
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


