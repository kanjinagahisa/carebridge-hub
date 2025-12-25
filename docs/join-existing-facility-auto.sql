-- ============================================================================
-- 既存の施設にユーザーを自動追加するSQL（自動版）
-- ============================================================================
-- このクエリは、作成済みの施設に現在のユーザーを自動的に追加します
-- 
-- 使用方法:
-- 1. このクエリをすべてコピー&ペーストして実行
-- 2. 成功すれば、ブラウザをリロードして /home にアクセスできるようになります
-- ============================================================================

-- ステップ1: 最新のユーザーと施設を取得して確認
-- このクエリで、ユーザーと施設が存在するか確認してください
SELECT 
  'ユーザー確認' as check_type,
  u.id as user_id,
  u.email,
  u.display_name
FROM users u
WHERE u.deleted = FALSE
ORDER BY u.created_at DESC
LIMIT 1;

SELECT 
  '施設確認' as check_type,
  f.id as facility_id,
  f.name as facility_name,
  f.type
FROM facilities f
WHERE f.name = 'テスト用施設 (RLS Policy Test)'
  AND f.deleted = FALSE
ORDER BY f.created_at DESC
LIMIT 1;

-- ステップ2: ユーザーを施設に追加（既に存在する場合はスキップ）
WITH latest_user AS (
  SELECT id as user_id
  FROM users
  WHERE deleted = FALSE
  ORDER BY created_at DESC
  LIMIT 1
),
test_facility AS (
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
  lu.user_id,
  tf.facility_id,
  'admin',
  NOW(),
  NOW(),
  FALSE
FROM latest_user lu
CROSS JOIN test_facility tf
WHERE NOT EXISTS (
  SELECT 1 
  FROM user_facility_roles ufr
  WHERE ufr.user_id = lu.user_id
    AND ufr.facility_id = tf.facility_id
    AND ufr.deleted = FALSE
)
RETURNING id, user_id, facility_id, role;

-- ステップ3: 追加されたことを確認
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
WHERE f.name = 'テスト用施設 (RLS Policy Test)'
  AND ufr.deleted = FALSE
ORDER BY ufr.created_at DESC;

