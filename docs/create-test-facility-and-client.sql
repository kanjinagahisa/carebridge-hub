-- ============================================================================
-- テスト用施設とクライアントを一括で作成するSQL
-- ============================================================================
-- このクエリは、施設が存在しない場合に、施設とクライアントを一度に作成します
-- 
-- 使用方法:
-- 1. まず、ステップ0でユーザーIDを取得してください
-- 2. 取得したユーザーIDをコピー
-- 3. ステップ2の YOUR_USER_ID_HERE を置き換えて実行
-- 4. 返された facility_id と client_id をメモしてください
-- ============================================================================

-- ステップ0: 現在のユーザーIDを取得
-- このクエリを実行して、user_id をコピーしてください
SELECT 
  id as user_id,
  email
FROM auth.users
ORDER BY created_at DESC
LIMIT 1;

-- ステップ1: テスト用施設を作成
-- 注意: facilitiesテーブルには type カラム（NOT NULL）が必要です
-- 使用可能な施設タイプ: 'after_school_day', 'day_service', 'rouken', 'sah', 'other'
INSERT INTO facilities (
  name,
  type,
  created_at,
  updated_at,
  deleted
) VALUES (
  'テスト用施設 (RLS Policy Test)',
  'other',  -- テスト用なので 'other' を使用
  NOW(),
  NOW(),
  FALSE
)
RETURNING id as facility_id, name as facility_name, type;

-- ステップ2: 作成した施設に現在のユーザーを管理者として追加
-- 注意: YOUR_USER_ID_HERE をステップ0で取得した user_id に置き換えてください
WITH new_facility AS (
  SELECT id as facility_id
  FROM facilities
  WHERE name = 'テスト用施設 (RLS Policy Test)'
    AND deleted = FALSE
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO user_facility_roles (
  user_id,
  facility_id,
  role,
  created_at,
  updated_at,
  deleted
)
SELECT 
  'YOUR_USER_ID_HERE'::uuid,  -- ← ステップ0で取得した user_id に置き換え
  facility_id,
  'admin',
  NOW(),
  NOW(),
  FALSE
FROM new_facility
RETURNING id, user_id, facility_id, role;

-- ステップ3: テスト用クライアントを作成
WITH new_facility AS (
  SELECT id as facility_id
  FROM facilities
  WHERE name = 'テスト用施設 (RLS Policy Test)'
    AND deleted = FALSE
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO clients (
  name,
  facility_id,
  created_at,
  updated_at,
  deleted
)
SELECT 
  'テスト用クライアント (RLS Policy Test)',
  facility_id,
  NOW(),
  NOW(),
  FALSE
FROM new_facility
RETURNING id as client_id, name as client_name, facility_id;

-- ステップ4: 作成されたデータを確認
SELECT 
  f.id as facility_id,
  f.name as facility_name,
  f.type as facility_type,
  c.id as client_id,
  c.name as client_name,
  ufr.user_id,
  ufr.role
FROM facilities f
LEFT JOIN clients c ON c.facility_id = f.id AND c.deleted = FALSE
LEFT JOIN user_facility_roles ufr ON ufr.facility_id = f.id AND ufr.deleted = FALSE
WHERE f.name = 'テスト用施設 (RLS Policy Test)'
  AND f.deleted = FALSE
ORDER BY f.created_at DESC
LIMIT 1;

