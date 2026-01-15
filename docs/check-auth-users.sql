-- ============================================================================
-- auth.usersテーブルの確認
-- ============================================================================
-- このクエリで、auth.usersテーブルにユーザーが存在するか確認できます
-- ============================================================================

-- 1. auth.usersテーブルにユーザーが存在するか確認
SELECT 
  'auth.usersテーブル' as table_name,
  COUNT(*) as total_auth_users
FROM auth.users;

-- 2. 最新のauth.usersユーザーを表示
SELECT 
  '最新auth.usersユーザー' as info_type,
  id as auth_user_id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. usersテーブルとauth.usersテーブルの比較
SELECT 
  'usersテーブル' as table_name,
  COUNT(*) as total_users
FROM users
WHERE deleted = FALSE;

SELECT 
  'auth.usersに存在するがusersテーブルに存在しないユーザー' as info_type,
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC
LIMIT 5;










