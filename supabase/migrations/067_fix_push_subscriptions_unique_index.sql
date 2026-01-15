-- ============================================================================
-- push_subscriptionsテーブルのUNIQUE INDEX追加
-- ============================================================================
-- 目的: PostgRESTのupsert onConflictで使用できるUNIQUE INDEXを明示的に作成
-- 問題: endpointカラムにUNIQUE制約はあるが、PostgRESTが認識しない場合がある
-- 解決: UNIQUE INDEXを明示的に作成して、onConflict: 'endpoint' を確実に動作させる
-- ============================================================================

-- 既存の非UNIQUEインデックスを削除（存在する場合）
DROP INDEX IF EXISTS idx_push_subscriptions_endpoint;

-- UNIQUE INDEXを作成（PostgRESTのonConflictで使用可能）
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint_unique 
ON push_subscriptions(endpoint);

-- 既存のUNIQUE制約が正しく機能しているか確認
-- 注意: endpointカラムには既にUNIQUE制約があるが、UNIQUE INDEXも追加することで
-- PostgRESTのupsert onConflictが確実に動作するようになる


