-- ============================================================================
-- Storage RLSテスト用クライアントID取得
-- ============================================================================
-- このクエリで、テスト用のクライアントIDを取得できます
-- ============================================================================

-- 1. 現在のユーザーが所属する施設のクライアントを取得
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  f.name as facility_name
FROM clients c
INNER JOIN facilities f ON c.facility_id = f.id
INNER JOIN user_facility_roles ufr ON ufr.facility_id = f.id
WHERE c.deleted = FALSE
  AND f.deleted = FALSE
  AND ufr.deleted = FALSE
  AND ufr.user_id = auth.uid()
ORDER BY c.created_at DESC
LIMIT 1;

-- 2. すべてのクライアントを確認（デバッグ用）
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  f.name as facility_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM user_facility_roles ufr 
      WHERE ufr.facility_id = c.facility_id 
        AND ufr.user_id = auth.uid() 
        AND ufr.deleted = FALSE
    ) THEN '自分の施設'
    ELSE '他の施設'
  END as access_status
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.created_at DESC
LIMIT 10;










