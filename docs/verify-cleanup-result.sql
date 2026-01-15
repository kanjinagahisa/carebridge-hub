-- ============================================
-- 削除結果の確認用SQL
-- ============================================
-- cleanup-test-data-option-a.sql を実行した後の確認用
-- ============================================

-- 1. 施設「RLS Policy Test」の削除状態を確認
SELECT 
  id, 
  name, 
  deleted, 
  updated_at,
  CASE 
    WHEN deleted = true THEN '✅ 削除済み'
    ELSE '⚠️ 削除されていません'
  END AS status
FROM facilities
WHERE name LIKE '%RLS Policy Test%';

-- 2. 指定ユーザーの関連付け状態を確認
SELECT 
  au.email,
  f.name AS facility_name,
  ufr.role,
  CASE 
    WHEN ufr.deleted = true THEN '✅ 削除済み'
    ELSE '⚠️ アクティブ（削除されていません）'
  END AS status,
  ufr.created_at,
  ufr.updated_at AS deleted_at
FROM auth.users au
JOIN user_facility_roles ufr ON ufr.user_id = au.id
JOIN facilities f ON f.id = ufr.facility_id
WHERE au.email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
ORDER BY ufr.deleted DESC, f.name;

-- 3. アクティブな関連付けが残っていないことを確認（0件であるべき）
SELECT 
  COUNT(*) AS active_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ 正常：アクティブな関連付けはありません'
    ELSE '⚠️ 警告：アクティブな関連付けが残っています'
  END AS message
FROM user_facility_roles ufr
WHERE ufr.user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
)
  AND ufr.deleted = false;

-- 4. ユーザーアカウントは残っていることを確認（アカウント自体は削除されていない）
SELECT 
  email,
  created_at,
  last_sign_in_at,
  '✅ ユーザーアカウントは残っています' AS status
FROM auth.users
WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
ORDER BY email;






