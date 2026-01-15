-- Verification queries after fixing clients facility_id
-- Run these queries to verify that the fix worked correctly

-- 1. Check all clients and their facilities
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  f.name as facility_name,
  c.deleted
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.name;

-- 2. Check which users can see which clients
-- This should show that both users can see the same clients
SELECT 
  u.email,
  u.display_name,
  ufr.facility_id as user_facility_id,
  f.name as facility_name,
  COUNT(DISTINCT c.id) as visible_clients_count
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
LEFT JOIN clients c ON c.facility_id = ufr.facility_id AND c.deleted = FALSE
WHERE u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
  AND ufr.deleted = FALSE
GROUP BY u.email, u.display_name, ufr.facility_id, f.name
ORDER BY u.email;

-- 3. Check if both users belong to the same facility
SELECT 
  f.id as facility_id,
  f.name as facility_name,
  COUNT(DISTINCT u.id) as user_count,
  STRING_AGG(DISTINCT u.email, ', ') as user_emails
FROM facilities f
JOIN user_facility_roles ufr ON f.id = ufr.facility_id
JOIN users u ON ufr.user_id = u.id
WHERE u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
  AND ufr.deleted = FALSE
  AND f.deleted = FALSE
GROUP BY f.id, f.name
HAVING COUNT(DISTINCT u.id) = 2;

-- 4. Check clients that should be visible to both users
SELECT 
  c.id,
  c.name,
  c.facility_id,
  f.name as facility_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_facility_roles ufr
      JOIN users u ON ufr.user_id = u.id
      WHERE ufr.facility_id = c.facility_id
        AND u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
        AND ufr.deleted = FALSE
    ) THEN 'Visible to both users'
    ELSE 'NOT visible to both users'
  END as visibility_status
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.name;




