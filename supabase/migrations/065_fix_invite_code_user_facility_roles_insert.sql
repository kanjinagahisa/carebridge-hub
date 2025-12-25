-- ============================================================================
-- 招待コード経由での施設参加を許可するRLSポリシー修正
-- ============================================================================
-- 問題: user_facility_rolesのINSERTポリシーが'staff'ロールを許可していない
-- 解決: 招待コード経由での参加を許可するポリシーを追加/修正
-- ============================================================================

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can add themselves to facilities" ON user_facility_roles;

-- 招待コード経由での施設参加を許可するポリシーを再作成
-- このポリシーは、ユーザーが自分自身を施設に追加することを許可します
-- 条件:
-- 1. user_id = auth.uid() (自分自身のみ)
-- 2. ロールは 'admin' または 'staff' を許可
-- 
-- 注意: 招待コードの有効性はアプリケーション側で検証されます
-- （RLSポリシーでは招待コードの存在確認は行いません）
CREATE POLICY "Users can add themselves to facilities"
  ON user_facility_roles FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- 施設作成時の管理者ロール（セットアップウィザード用）
      role = 'admin'
      OR
      -- 招待コード経由での参加（staffロール）
      role = 'staff'
      OR
      -- 後方互換性のため 'member' も許可（既存のポリシーとの互換性）
      role = 'member'
    )
  );

-- ポリシーの確認
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_facility_roles'
  AND policyname = 'Users can add themselves to facilities';

