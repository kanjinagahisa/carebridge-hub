-- ============================================================================
-- push_subscriptionsテーブルにfacility_idカラムを追加
-- ============================================================================
-- 目的: 同じfacilityのユーザーにWeb Push通知を送信するために必要
-- ============================================================================

-- facility_idカラムを追加
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE;

-- インデックスを作成（facility_idで検索するため）
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_facility_id 
ON push_subscriptions(facility_id);


