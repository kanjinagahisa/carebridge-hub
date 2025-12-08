-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_facility_id ON invite_codes(facility_id);

-- Enable Row Level Security
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Invite codes policies
CREATE POLICY "Users can view invite codes for their facilities"
  ON invite_codes FOR SELECT
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

CREATE POLICY "Admins can create invite codes for their facilities"
  ON invite_codes FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT ufr.facility_id
      FROM user_facility_roles ufr
      WHERE ufr.user_id = auth.uid()
        AND ufr.role = 'admin'
        AND ufr.deleted = FALSE
    )
  );


