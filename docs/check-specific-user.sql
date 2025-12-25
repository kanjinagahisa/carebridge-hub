-- ============================================================================
-- 特定ユーザーのusersテーブル存在確認
-- ============================================================================
-- このクエリで、nivers.nagatomi@gmail.comがusersテーブルに存在するか確認できます
-- ============================================================================

-- 1. auth.usersから該当ユーザーを確認
SELECT 
  'auth.users' as source,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'nivers.nagatomi@gmail.com';

-- 2. usersテーブルから該当ユーザーを確認
SELECT 
  'usersテーブル' as source,
  id,
  email,
  display_name,
  profession,
  created_at
FROM users
WHERE email = 'nivers.nagatomi@gmail.com'
  AND deleted = FALSE;

-- 3. 存在確認（JOINで確認）
SELECT 
  au.id as auth_user_id,
  au.email,
  au.email_confirmed_at,
  CASE 
    WHEN u.id IS NULL THEN 'usersテーブルに存在しない'
    ELSE 'usersテーブルに存在する'
  END as status
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE au.email = 'nivers.nagatomi@gmail.com';









