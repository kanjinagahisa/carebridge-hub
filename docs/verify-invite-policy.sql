-- ============================================================================
-- 招待コード経由での施設参加ポリシーの確認
-- ============================================================================
-- このクエリで、user_facility_rolesのINSERTポリシーが正しく設定されているか確認できます
-- ============================================================================

-- ポリシーの詳細を確認
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

-- ポリシーが許可するロールを確認
-- with_check句を解析して、許可されているロールを表示
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check LIKE '%role = ''admin''%' THEN 'admin: 許可'
    ELSE 'admin: 未許可'
  END as admin_allowed,
  CASE 
    WHEN with_check LIKE '%role = ''staff''%' THEN 'staff: 許可'
    ELSE 'staff: 未許可'
  END as staff_allowed,
  CASE 
    WHEN with_check LIKE '%role = ''member''%' THEN 'member: 許可'
    ELSE 'member: 未許可'
  END as member_allowed
FROM pg_policies
WHERE tablename = 'user_facility_roles'
  AND policyname = 'Users can add themselves to facilities';









