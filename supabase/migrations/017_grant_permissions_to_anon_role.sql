-- Fix: Grant permissions to anon role as well
-- createBrowserClient uses anon key, so requests are sent as anon role
-- Even with Authorization header, we need to grant permissions to anon role
-- PostgREST will still evaluate the JWT token from Authorization header
-- and use auth.uid() for RLS policy evaluation

-- Grant usage on public schema to anon role
GRANT USAGE ON SCHEMA public TO anon;

-- Grant INSERT permission on facilities table to anon role
GRANT INSERT ON TABLE facilities TO anon;

-- Also grant SELECT permission (needed for .select() after insert)
GRANT SELECT ON TABLE facilities TO anon;

-- Grant permissions to authenticated role as well (for completeness)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON TABLE facilities TO authenticated;
GRANT SELECT ON TABLE facilities TO authenticated;

-- Also grant permissions on user_facility_roles table
GRANT INSERT ON TABLE user_facility_roles TO anon;
GRANT SELECT ON TABLE user_facility_roles TO anon;
GRANT INSERT ON TABLE user_facility_roles TO authenticated;
GRANT SELECT ON TABLE user_facility_roles TO authenticated;












