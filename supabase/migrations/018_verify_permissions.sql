-- Verify that permissions are correctly granted
-- This will help us confirm if permissions are the issue

-- Check schema permissions
SELECT 
  nspname as schema_name,
  rolname as role_name,
  has_schema_privilege(rolname, nspname, 'USAGE') as has_usage
FROM pg_namespace n
CROSS JOIN pg_roles r
WHERE nspname = 'public' 
  AND rolname IN ('anon', 'authenticated')
ORDER BY schema_name, role_name;

-- Check table permissions for facilities
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

-- Check table permissions for user_facility_roles
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'user_facility_roles'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

