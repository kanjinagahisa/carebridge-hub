-- ============================================================================
-- ユーザーと施設の存在確認クエリ
-- ============================================================================
-- このクエリで、usersテーブルとfacilitiesテーブルの状態を確認できます
-- ============================================================================

-- 1. usersテーブルにユーザーが存在するか確認
SELECT 
  'usersテーブル' as table_name,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_users
FROM users;

-- 2. 最新のユーザーを表示（存在する場合）
SELECT 
  '最新ユーザー' as info_type,
  id as user_id,
  email,
  display_name,
  profession,
  created_at
FROM users
WHERE deleted = FALSE
ORDER BY created_at DESC
LIMIT 1;

-- 3. facilitiesテーブルに施設が存在するか確認
SELECT 
  'facilitiesテーブル' as table_name,
  COUNT(*) as total_facilities,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_facilities
FROM facilities;

-- 4. テスト用施設を表示
SELECT 
  'テスト用施設' as info_type,
  id as facility_id,
  name as facility_name,
  type,
  created_at
FROM facilities
WHERE name = 'テスト用施設 (RLS Policy Test)'
  AND deleted = FALSE
ORDER BY created_at DESC
LIMIT 1;

-- 5. user_facility_rolesテーブルの状態確認
SELECT 
  'user_facility_rolesテーブル' as table_name,
  COUNT(*) as total_roles,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_roles
FROM user_facility_roles;

-- 6. 既存のuser_facility_rolesレコードを表示
SELECT 
  ufr.id,
  ufr.user_id,
  u.email as user_email,
  ufr.facility_id,
  f.name as facility_name,
  ufr.role,
  ufr.deleted
FROM user_facility_roles ufr
LEFT JOIN users u ON u.id = ufr.user_id
LEFT JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.deleted = FALSE
ORDER BY ufr.created_at DESC
LIMIT 10;










