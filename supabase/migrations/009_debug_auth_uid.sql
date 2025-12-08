-- This SQL will help us understand what auth.uid() returns during an INSERT operation
-- We'll create a test function to check if auth.uid() is working correctly

-- Function to test auth.uid() in the context of an INSERT
CREATE OR REPLACE FUNCTION test_auth_uid()
RETURNS TABLE(
  auth_uid UUID,
  auth_role TEXT,
  is_authenticated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as auth_uid,
    auth.role()::TEXT as auth_role,
    (auth.uid() IS NOT NULL) as is_authenticated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This function uses SECURITY DEFINER, so it will run with elevated privileges
-- We need to test this from the application context, not directly in SQL Editor


