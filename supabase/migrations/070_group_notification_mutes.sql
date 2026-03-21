-- グループ単位の通知ミュートテーブル
CREATE TABLE IF NOT EXISTS group_notification_mutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_notification_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own group notification mutes"
  ON group_notification_mutes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own group notification mutes"
  ON group_notification_mutes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own group notification mutes"
  ON group_notification_mutes FOR DELETE
  USING (user_id = auth.uid());
