-- Check all facilities that the original user belongs to
-- This will help identify if there are any unnecessary facility associations

-- 1. Check all facilities for the original user
SELECT 
  u.email,
  u.display_name,
  ufr.facility_id,
  f.name as facility_name,
  f.type as facility_type,
  ufr.role,
  ufr.created_at as joined_at,
  ufr.deleted,
  COUNT(DISTINCT c.id) as clients_count,
  COUNT(DISTINCT g.id) as groups_count
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
LEFT JOIN clients c ON c.facility_id = ufr.facility_id AND c.deleted = FALSE
LEFT JOIN groups g ON g.facility_id = ufr.facility_id AND g.deleted = FALSE
WHERE u.email = 'kanjinagatomi99@gmail.com'
  AND ufr.deleted = FALSE
GROUP BY u.email, u.display_name, ufr.facility_id, f.name, f.type, ufr.role, ufr.created_at, ufr.deleted
ORDER BY ufr.created_at DESC;

-- 2. Check if there are duplicate or unnecessary facility associations
-- (e.g., same facility with different roles or multiple entries)
SELECT 
  u.email,
  ufr.facility_id,
  f.name as facility_name,
  COUNT(*) as role_count,
  STRING_AGG(DISTINCT ufr.role, ', ') as roles,
  STRING_AGG(DISTINCT ufr.id::text, ', ') as role_ids
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
WHERE u.email = 'kanjinagatomi99@gmail.com'
  AND ufr.deleted = FALSE
GROUP BY u.email, ufr.facility_id, f.name
HAVING COUNT(*) > 1
ORDER BY role_count DESC;

-- 3. Check which facility has the clients (永富デイサービス)
SELECT 
  f.id as facility_id,
  f.name as facility_name,
  COUNT(DISTINCT c.id) as clients_count,
  COUNT(DISTINCT ufr.user_id) as users_count,
  STRING_AGG(DISTINCT u.email, ', ') as user_emails
FROM facilities f
LEFT JOIN clients c ON c.facility_id = f.id AND c.deleted = FALSE
LEFT JOIN user_facility_roles ufr ON f.id = ufr.facility_id AND ufr.deleted = FALSE
LEFT JOIN users u ON ufr.user_id = u.id
WHERE f.name LIKE '%永富デイサービス%'
  AND f.deleted = FALSE
GROUP BY f.id, f.name
ORDER BY clients_count DESC;



