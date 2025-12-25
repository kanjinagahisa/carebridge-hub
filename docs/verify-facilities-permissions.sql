-- Check table permissions for facilities
-- This verifies that anon and authenticated roles have INSERT and SELECT permissions on facilities table
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;









