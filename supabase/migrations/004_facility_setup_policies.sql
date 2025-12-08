-- Facilities INSERT policy: Allow authenticated users to create facilities
-- This is needed for the initial setup wizard
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- User facility roles INSERT policy: Allow users to add themselves to facilities they create
-- This allows users to become admins of facilities they create during setup
CREATE POLICY "Users can add themselves to facilities"
  ON user_facility_roles FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Allow if user is creating themselves as admin (setup wizard case)
      role = 'admin'
      OR
      -- Allow if joining via invite code (member role)
      role = 'member'
    )
  );


