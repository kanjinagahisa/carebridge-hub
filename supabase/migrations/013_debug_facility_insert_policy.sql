-- Temporary debug policy to test if auth.uid() is being evaluated
-- This policy allows ALL authenticated users to insert, without any conditions
-- If this works, it confirms that auth.uid() evaluation is the issue

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;

-- Create a very permissive policy for debugging
-- This will help us determine if the issue is with auth.uid() evaluation
CREATE POLICY "Debug: Allow all authenticated inserts"
  ON facilities FOR INSERT
  WITH CHECK (true);

-- Note: This is a temporary policy for debugging only
-- After confirming the issue, we will restore the proper policy











