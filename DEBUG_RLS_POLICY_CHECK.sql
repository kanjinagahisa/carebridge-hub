-- RLSポリシーの状態を確認するSQLクエリ
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. user_facility_roles テーブルのRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_facility_roles'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. 実際にクエリが動作するかテスト（認証済みユーザーのIDを指定）
-- 注意: このクエリは認証コンテキストがないため、RLSにより結果が返らない可能性があります
-- ミドルウェアのログで確認する方が確実です

-- 3. RLSが有効になっているか確認
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'user_facility_roles'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');











