-- ============================================================================
-- テスト用クライアントを作成するSQL
-- ============================================================================
-- このクエリは、Storage RLSポリシーのテスト用にクライアントを作成します
-- 
-- 使用方法:
-- 1. ステップ1を実行して施設IDを取得
-- 2. ステップ2で取得した facility_id をコピー
-- 3. ステップ3の YOUR_FACILITY_ID_HERE を置き換えて実行
-- 4. 返された id（クライアントID）をメモしてください
-- ============================================================================

-- ステップ1: 現在のユーザーが所属している施設IDを取得
-- このクエリを実行して、facility_id を確認してください
SELECT 
  ufr.facility_id,
  f.name as facility_name,
  ufr.role
FROM user_facility_roles ufr
LEFT JOIN facilities f ON ufr.facility_id = f.id
WHERE ufr.user_id = auth.uid()
  AND ufr.deleted = FALSE
  AND f.deleted = FALSE
ORDER BY f.created_at DESC
LIMIT 1;

-- ステップ2: 施設が存在しない場合の確認
-- 上記で結果が返らない場合は、まず施設を作成する必要があります
SELECT 
  COUNT(*) as facility_count
FROM facilities
WHERE deleted = FALSE;

-- ステップ3: 施設が存在しない場合、まず施設を作成
-- 注意: facilitiesテーブルには type カラム（NOT NULL）が必要です
INSERT INTO facilities (
  name,
  type,
  created_at,
  updated_at,
  deleted
) VALUES (
  'テスト用施設 (RLS Policy Test)',
  'other',  -- 施設タイプ: 'after_school_day', 'day_service', 'rouken', 'sah', 'other' のいずれか
  NOW(),
  NOW(),
  FALSE
)
RETURNING id, name, type;

-- ステップ4: 作成した施設に現在のユーザーを管理者として追加
-- 上記で取得した施設IDを使用（YOUR_FACILITY_ID_HERE を置き換え）
INSERT INTO user_facility_roles (
  user_id,
  facility_id,
  role,
  created_at,
  updated_at,
  deleted
) VALUES (
  auth.uid(),
  'YOUR_FACILITY_ID_HERE'::uuid,  -- ← ステップ3で取得した施設IDに置き換え
  'admin',
  NOW(),
  NOW(),
  FALSE
)
RETURNING id, user_id, facility_id, role;

-- ステップ5: テスト用クライアントを作成
-- 注意: YOUR_FACILITY_ID_HERE をステップ3で取得した facility_id に置き換えてください

INSERT INTO clients (
  name,
  facility_id,
  created_at,
  updated_at,
  deleted
) VALUES (
  'テスト用クライアント (RLS Policy Test)',
  'YOUR_FACILITY_ID_HERE'::uuid,  -- ← ステップ3で取得した facility_id に置き換え
  NOW(),
  NOW(),
  FALSE
)
RETURNING id, name, facility_id;

-- ステップ4: 作成されたクライアントIDを確認
-- 上記のクエリで返された id をメモしてください
-- この id が、Storage RLSポリシーのテストで使用するクライアントIDです

