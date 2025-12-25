-- Fix: Grant INSERT and SELECT permissions to anon role on facilities table
-- This is required because Supabase client uses anon key, so requests are sent as anon role
-- PostgREST will still evaluate the JWT token from Authorization header
-- and use auth.uid() for RLS policy evaluation

-- First, ensure we have the necessary schema permissions
GRANT USAGE ON SCHEMA public TO anon;

-- Grant INSERT permission on facilities table to anon role
-- Using WITH GRANT OPTION is not needed, but we'll grant it explicitly
GRANT INSERT ON TABLE public.facilities TO anon;

-- Grant SELECT permission on facilities table to anon role (needed for .select() after insert)
GRANT SELECT ON TABLE public.facilities TO anon;

-- Verify the permissions were granted
-- First, check if INSERT and SELECT are granted to anon
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee = 'anon'
  AND privilege_type IN ('INSERT', 'SELECT')
ORDER BY privilege_type;

-- Also verify all permissions for anon on facilities table
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee = 'anon'
ORDER BY privilege_type;

