-- データベースのデータ状況を確認するクエリ

-- 1. クライアントデータの確認
SELECT 
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_clients,
  COUNT(*) FILTER (WHERE deleted = TRUE) as deleted_clients
FROM clients;

-- 2. すべてのクライアント（削除済み含む）を表示
SELECT 
  id,
  name,
  facility_id,
  deleted,
  created_at
FROM clients
ORDER BY created_at DESC
LIMIT 10;

-- 3. 施設データの確認
SELECT 
  COUNT(*) as total_facilities,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_facilities
FROM facilities;

-- 4. 施設一覧を表示
SELECT 
  id,
  name,
  deleted,
  created_at
FROM facilities
WHERE deleted = FALSE
ORDER BY created_at DESC
LIMIT 10;

-- 5. グループデータの確認
SELECT 
  COUNT(*) as total_groups,
  COUNT(*) FILTER (WHERE deleted = FALSE) as active_groups
FROM groups;

-- 6. グループ一覧を表示
SELECT 
  id,
  name,
  facility_id,
  deleted,
  created_at
FROM groups
WHERE deleted = FALSE
ORDER BY created_at DESC
LIMIT 10;

-- 7. 現在のユーザーの施設所属を確認
SELECT 
  u.id as user_id,
  u.email,
  ufr.facility_id,
  f.name as facility_name,
  ufr.role,
  ufr.deleted
FROM auth.users u
LEFT JOIN user_facility_roles ufr ON u.id = ufr.user_id
LEFT JOIN facilities f ON ufr.facility_id = f.id
WHERE ufr.deleted = FALSE
ORDER BY u.email;









