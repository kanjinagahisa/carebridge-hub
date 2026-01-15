-- ============================================================================
-- auth.usersからusersテーブルにユーザーレコードを作成するSQL
-- ============================================================================
-- このクエリは、auth.usersに存在するがusersテーブルに存在しないユーザーを
-- usersテーブルに作成します
-- 
-- 使用方法:
-- 1. このクエリをすべてコピー&ペーストして実行
-- 2. 作成されたユーザーIDをメモしてください
-- ============================================================================

-- ステップ1: auth.usersに存在するがusersテーブルに存在しないユーザーを確認
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'display_name' as display_name_from_meta,
  au.raw_user_meta_data->>'profession' as profession_from_meta,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC
LIMIT 5;

-- ステップ2: usersテーブルにユーザーレコードを作成
-- 注意: auth.usersのraw_user_meta_dataからdisplay_nameとprofessionを取得
-- これらが存在しない場合は、デフォルト値を使用
INSERT INTO users (
  id,
  email,
  display_name,
  profession,
  created_at,
  updated_at,
  deleted
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    SPLIT_PART(au.email, '@', 1),  -- メールアドレスの@より前の部分をデフォルト名として使用
    'ユーザー'  -- それも取得できない場合のフォールバック
  ) as display_name,
  COALESCE(
    au.raw_user_meta_data->>'profession',
    'other'  -- デフォルトの職種
  ) as profession,
  au.created_at,
  NOW(),
  FALSE
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC
LIMIT 1
RETURNING id, email, display_name, profession;

-- ステップ3: 作成されたユーザーを確認
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.profession,
  u.created_at
FROM users u
WHERE u.deleted = FALSE
ORDER BY u.created_at DESC
LIMIT 5;










