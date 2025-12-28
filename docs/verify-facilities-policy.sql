-- Verify that the correct policy exists for facilities INSERT
-- This query will show all policies on the facilities table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'facilities'
  AND cmd = 'INSERT';










