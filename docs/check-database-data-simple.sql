-- データベースの状態を簡単に確認するクエリ（1つずつ実行）

-- ============================================================================
-- クエリ1: クライアントデータの確認
-- ============================================================================
SELECT 
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_clients,
  COUNT(*) FILTER (WHERE deleted = TRUE) as deleted_clients
FROM clients;

-- ============================================================================
-- クエリ2: 施設データの確認
-- ============================================================================
SELECT 
  COUNT(*) as total_facilities,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_facilities
FROM facilities;

-- ============================================================================
-- クエリ3: 現在のユーザーが所属している施設を確認
-- ============================================================================
SELECT 
  ufr.facility_id,
  f.name as facility_name,
  ufr.role
FROM user_facility_roles ufr
LEFT JOIN facilities f ON ufr.facility_id = f.id
WHERE ufr.user_id = auth.uid()
  AND ufr.deleted = FALSE
  AND f.deleted = FALSE
ORDER BY f.created_at DESC;

-- ============================================================================
-- クエリ4: グループデータの確認（参考）
-- ============================================================================
SELECT 
  COUNT(*) as total_groups,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_groups
FROM groups;









