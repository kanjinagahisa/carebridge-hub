-- 確実にRLSポリシーを適用するためのマイグレーション
-- 古いポリシーを完全に削除し、新しいポリシーを適用

-- 1. すべての既存のSELECTポリシーを削除（名前に関係なく）
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'user_facility_roles' 
          AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_facility_roles', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- 2. 新しいポリシーを作成（循環参照を避ける）
CREATE POLICY "Users can view their own roles"
  ON user_facility_roles FOR SELECT
  USING (
    user_id = auth.uid()
    AND deleted = FALSE
  );

-- 3. ポリシーが正しく作成されたか確認
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_facility_roles'
  AND cmd = 'SELECT';











