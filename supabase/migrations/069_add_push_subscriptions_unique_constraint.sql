-- ============================================================================
-- push_subscriptionsテーブルに (user_id, endpoint, facility_id) の UNIQUE 制約を追加
-- ============================================================================
-- 目的: 同一端末・同一施設で購読を何回押しても、レコードが増えず更新になるようにする
-- 注意: endpoint の UNIQUE 制約を削除し、user_id + endpoint + facility_id の組み合わせで
--       ユニークにする（PostgREST の upsert で使用可能な UNIQUE インデックス）
-- ============================================================================

-- endpoint の UNIQUE 制約を削除（既存の UNIQUE インデックスも削除）
-- 注意: endpoint カラムの UNIQUE 制約は、テーブル定義で指定されているため、
-- まず UNIQUE インデックスを削除してから、制約を削除する必要がある
DROP INDEX IF EXISTS idx_push_subscriptions_endpoint_unique;

-- endpoint カラムの UNIQUE 制約を削除
-- 注意: ALTER TABLE ... DROP CONSTRAINT は制約名が必要だが、テーブル定義で
-- 直接指定されている場合は制約名が自動生成されるため、以下の方法で削除
-- （PostgreSQL では、UNIQUE 制約は内部的に UNIQUE インデックスとして実装される）
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_key;

-- (user_id, endpoint, facility_id) の UNIQUE インデックスを追加
-- PostgREST の upsert onConflict で使用可能にするため、UNIQUE インデックスを作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint_facility_unique
ON push_subscriptions(user_id, endpoint, facility_id);

-- 変更内容:
-- - endpoint の UNIQUE 制約を削除: 同じ endpoint で異なる user_id や facility_id の組み合わせを許可
-- - (user_id, endpoint, facility_id) の UNIQUE インデックスを追加: 同じユーザー・同じ端末・同じ施設での重複登録を防止
-- これにより、同じユーザーが同じ端末で異なる施設に購読登録することは可能だが、
-- 同じユーザー・同じ端末・同じ施設での重複登録は防止される

