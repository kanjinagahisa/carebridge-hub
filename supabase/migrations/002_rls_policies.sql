-- Enable Row Level Security
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facility_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's facility IDs
CREATE OR REPLACE FUNCTION get_user_facility_ids(user_uuid UUID)
RETURNS TABLE(facility_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT ufr.facility_id
  FROM user_facility_roles ufr
  WHERE ufr.user_id = user_uuid
    AND ufr.deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Facilities policies
CREATE POLICY "Users can view facilities they belong to"
  ON facilities FOR SELECT
  USING (
    id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND deleted = FALSE
  );

-- Users policies
CREATE POLICY "Users can view users in their facilities"
  ON users FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT ufr.user_id
      FROM user_facility_roles ufr
      WHERE ufr.facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND ufr.deleted = FALSE
    )
    AND deleted = FALSE
  );

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- User facility roles policies
CREATE POLICY "Users can view roles in their facilities"
  ON user_facility_roles FOR SELECT
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND deleted = FALSE
  );

-- Clients policies
CREATE POLICY "Users can view clients in their facilities"
  ON clients FOR SELECT
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND deleted = FALSE
  );

CREATE POLICY "Users can insert clients in their facilities"
  ON clients FOR INSERT
  WITH CHECK (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

CREATE POLICY "Users can update clients in their facilities"
  ON clients FOR UPDATE
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

-- Groups policies
CREATE POLICY "Users can view groups in their facilities"
  ON groups FOR SELECT
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND deleted = FALSE
  );

CREATE POLICY "Users can insert groups in their facilities"
  ON groups FOR INSERT
  WITH CHECK (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update groups in their facilities"
  ON groups FOR UPDATE
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

-- Group members policies
CREATE POLICY "Users can view members of groups in their facilities"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
    AND deleted = FALSE
  );

CREATE POLICY "Users can insert members to groups in their facilities"
  ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );

-- Posts policies
CREATE POLICY "Users can view posts in groups of their facilities"
  ON posts FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
    AND deleted = FALSE
  );

CREATE POLICY "Users can insert posts in groups of their facilities"
  ON posts FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
    AND author_id = auth.uid()
  );

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (author_id = auth.uid());

-- Post reactions policies
CREATE POLICY "Users can view reactions to posts in their facilities"
  ON post_reactions FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM posts
      WHERE group_id IN (
        SELECT id FROM groups
        WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
          AND deleted = FALSE
      )
      AND deleted = FALSE
    )
  );

CREATE POLICY "Users can insert reactions to posts in their facilities"
  ON post_reactions FOR INSERT
  WITH CHECK (
    post_id IN (
      SELECT id FROM posts
      WHERE group_id IN (
        SELECT id FROM groups
        WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
          AND deleted = FALSE
      )
      AND deleted = FALSE
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own reactions"
  ON post_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Post bookmarks policies
CREATE POLICY "Users can view their own bookmarks"
  ON post_bookmarks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own bookmarks"
  ON post_bookmarks FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND post_id IN (
      SELECT id FROM posts
      WHERE group_id IN (
        SELECT id FROM groups
        WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
          AND deleted = FALSE
      )
      AND deleted = FALSE
    )
  );

CREATE POLICY "Users can delete their own bookmarks"
  ON post_bookmarks FOR DELETE
  USING (user_id = auth.uid());

-- Post reads policies
CREATE POLICY "Users can view their own reads"
  ON post_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reads"
  ON post_reads FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND post_id IN (
      SELECT id FROM posts
      WHERE group_id IN (
        SELECT id FROM groups
        WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
          AND deleted = FALSE
      )
      AND deleted = FALSE
    )
  );

-- Attachments policies
CREATE POLICY "Users can view attachments in their facilities"
  ON attachments FOR SELECT
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND deleted = FALSE
  );

CREATE POLICY "Users can insert attachments in their facilities"
  ON attachments FOR INSERT
  WITH CHECK (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

CREATE POLICY "Users can update attachments in their facilities"
  ON attachments FOR UPDATE
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
  );

