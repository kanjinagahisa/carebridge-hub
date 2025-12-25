-- ============================================
-- 既存テストデータの削除（オプションA）
-- ============================================
-- 施設とユーザーの関連付けのみ削除（推奨）
-- ユーザーアカウントは残ります
--
-- 実行手順:
-- 1. Supabase SQL Editorを開く
-- 2. このファイルの内容をコピーして実行
-- 3. 各ステップを順番に実行してください
-- ============================================

-- ============================================
-- ステップ1: 削除前に確認（推奨）
-- ============================================

-- 「RLS Policy Test」という名前の施設を確認
SELECT 
  id, 
  name, 
  type, 
  created_at, 
  deleted
FROM facilities
WHERE name LIKE '%RLS Policy Test%'
  AND deleted = false;

-- 特定のメールアドレスのユーザーが所属している施設を確認
SELECT 
  au.email,
  f.name AS facility_name,
  ufr.role,
  ufr.deleted AS role_deleted,
  ufr.created_at
FROM auth.users au
JOIN user_facility_roles ufr ON ufr.user_id = au.id
JOIN facilities f ON f.id = ufr.facility_id
WHERE au.email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
  AND ufr.deleted = false
  AND f.deleted = false;

-- ============================================
-- ステップ2: 施設を論理削除（soft delete）
-- ============================================

-- 「RLS Policy Test」という名前の施設を論理削除
UPDATE facilities
SET deleted = true, updated_at = NOW()
WHERE name LIKE '%RLS Policy Test%'
  AND deleted = false;

-- 削除された施設数を確認（0件の場合は該当なし）
SELECT 
  COUNT(*) AS deleted_count,
  '施設が削除されました' AS message
FROM facilities
WHERE name LIKE '%RLS Policy Test%'
  AND deleted = true;

-- ============================================
-- ステップ3: ユーザーの施設との関連付けを削除
-- ============================================

-- 特定のメールアドレスのユーザーを全ての施設から削除
UPDATE user_facility_roles ufr
SET deleted = true, updated_at = NOW()
WHERE ufr.user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
)
  AND ufr.deleted = false;

-- 削除された関連付け数を確認
SELECT 
  COUNT(*) AS deleted_count,
  '関連付けが削除されました' AS message
FROM user_facility_roles ufr
WHERE ufr.user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
)
  AND ufr.deleted = true;

-- ============================================
-- ステップ4: 削除結果を確認
-- ============================================

-- 削除された施設を確認
SELECT 
  id, 
  name, 
  deleted, 
  updated_at
FROM facilities
WHERE name LIKE '%RLS Policy Test%';

-- 削除された関連付けを確認（deleted = true のもの）
SELECT 
  au.email,
  f.name AS facility_name,
  ufr.role,
  ufr.deleted AS role_deleted,
  ufr.updated_at AS deleted_at
FROM auth.users au
JOIN user_facility_roles ufr ON ufr.user_id = au.id
JOIN facilities f ON f.id = ufr.facility_id
WHERE au.email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
ORDER BY ufr.deleted DESC, f.name;

-- アクティブな関連付けが残っていないことを確認（0件であるべき）
SELECT 
  COUNT(*) AS active_count,
  'アクティブな関連付けが残っています（要確認）' AS message
FROM user_facility_roles ufr
WHERE ufr.user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
)
  AND ufr.deleted = false;





