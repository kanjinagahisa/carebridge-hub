-- RLSポリシーの状態を確認するSQLクエリ
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. user_facility_roles テーブルの現在のSELECTポリシーを確認
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_facility_roles'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. 古いポリシーが残っていないか確認
-- 以下のポリシー名が存在する場合は、削除が必要です：
-- - "Users can view roles in their facilities"
-- 以下のポリシー名が存在することを確認：
-- - "Users can view their own roles"

-- 3. RLSが有効になっているか確認
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'user_facility_roles'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');










