-- ============================================================================
-- 新規登録ユーザーのusersテーブル存在確認
-- ============================================================================
-- このクエリで、auth.usersに存在するがusersテーブルに存在しないユーザーを確認できます
-- ============================================================================

-- 1. 最新のauth.usersユーザーを確認
SELECT 
  'auth.users' as source,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. 最新のusersテーブルのユーザーを確認
SELECT 
  'usersテーブル' as source,
  id,
  email,
  display_name,
  profession,
  created_at
FROM users
WHERE deleted = FALSE
ORDER BY created_at DESC
LIMIT 5;

-- 3. auth.usersに存在するがusersテーブルに存在しないユーザーを確認
-- 注意: auth.usersテーブルにはdeletedカラムが存在しないため、条件から除外
SELECT 
  au.id as auth_user_id,
  au.email,
  au.email_confirmed_at,
  au.created_at as auth_created_at,
  CASE 
    WHEN u.id IS NULL THEN 'usersテーブルに存在しない'
    ELSE 'usersテーブルに存在する'
  END as status
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

