-- Check schema permissions
-- This verifies that anon and authenticated roles have USAGE permission on public schema
SELECT 
  nspname as schema_name,
  rolname as role_name,
  has_schema_privilege(rolname, nspname, 'USAGE') as has_usage
FROM pg_namespace n
CROSS JOIN pg_roles r
WHERE nspname = 'public' 
  AND rolname IN ('anon', 'authenticated')
ORDER BY schema_name, role_name;









