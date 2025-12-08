-- Fix user_facility_roles SELECT policy to avoid circular reference
-- The current policy uses get_user_facility_ids() which references user_facility_roles,
-- causing a circular dependency that prevents the middleware from seeing newly created records

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view roles in their facilities" ON user_facility_roles;

-- Create a new policy that directly checks user_id = auth.uid()
-- This avoids the circular reference and allows users to see their own roles
CREATE POLICY "Users can view their own roles"
  ON user_facility_roles FOR SELECT
  USING (
    user_id = auth.uid()
    AND deleted = FALSE
  );











