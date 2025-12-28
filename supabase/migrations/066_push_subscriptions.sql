-- ============================================================================
-- Web Push通知購読テーブルの作成
-- ============================================================================
-- 目的: Web Push通知の購読情報を保存
-- 注意: 購読は端末・ブラウザ単位なので、同一ユーザーでも複数行になることがある
-- ============================================================================

-- push_subscriptionsテーブルを作成
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- updated_atを自動更新するトリガー
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLSポリシーの設定
-- ============================================================================
-- ユーザーは自分の購読情報のみ参照・更新・削除可能
-- endpoint は準個人情報として扱い、本人以外は参照不可
-- ============================================================================

-- RLSを有効化
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECTポリシー: 本人のみ参照可能
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- INSERTポリシー: 本人のみ登録可能
CREATE POLICY "Users can insert their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATEポリシー: 本人のみ更新可能
CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETEポリシー: 本人のみ削除可能
CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());


