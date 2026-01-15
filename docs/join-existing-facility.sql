-- ============================================================================
-- 既存の施設にユーザーを追加するSQL
-- ============================================================================
-- このクエリは、作成済みの施設に現在のユーザーを追加します
-- 
-- 使用方法:
-- 1. ステップ1で現在のユーザーIDを確認
-- 2. ステップ2で施設IDを確認（先ほど作成した施設）
-- 3. ステップ3で user_facility_roles にレコードを追加
-- ============================================================================

-- ステップ1: 現在のユーザーIDを確認
-- usersテーブルに存在するユーザーIDを取得
SELECT 
  id as user_id,
  email,
  display_name,
  profession
FROM users
WHERE deleted = FALSE
ORDER BY created_at DESC
LIMIT 1;

-- ステップ2: 作成済みの施設IDを確認
-- 先ほど作成した「テスト用施設 (RLS Policy Test)」のIDを取得
SELECT 
  id as facility_id,
  name as facility_name,
  type
FROM facilities
WHERE name = 'テスト用施設 (RLS Policy Test)'
  AND deleted = FALSE
ORDER BY created_at DESC
LIMIT 1;

-- ステップ3: ユーザーを施設に追加
-- 注意: YOUR_USER_ID_HERE と YOUR_FACILITY_ID_HERE を上記で取得したIDに置き換えてください
INSERT INTO user_facility_roles (
  user_id,
  facility_id,
  role,
  created_at,
  updated_at,
  deleted
) VALUES (
  'YOUR_USER_ID_HERE'::uuid,  -- ← ステップ1で取得した user_id に置き換え
  'YOUR_FACILITY_ID_HERE'::uuid,  -- ← ステップ2で取得した facility_id に置き換え（または '58fedddc-9b8c-48b0-bb9a-fdc5792c13fc'）
  'admin',
  NOW(),
  NOW(),
  FALSE
)
RETURNING id, user_id, facility_id, role;

-- ステップ4: 追加されたことを確認
SELECT 
  ufr.id,
  ufr.user_id,
  u.email,
  ufr.facility_id,
  f.name as facility_name,
  ufr.role,
  ufr.deleted
FROM user_facility_roles ufr
LEFT JOIN users u ON u.id = ufr.user_id
LEFT JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.deleted = FALSE
ORDER BY ufr.created_at DESC
LIMIT 5;










