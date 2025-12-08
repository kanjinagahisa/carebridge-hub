-- Diagnose and fix clients facility_id mismatch
-- This migration will first diagnose the issue, then fix it

-- Step 1: Diagnose - Check current state
-- Run these queries first to understand the situation:

-- 1.1. Check all clients and their facilities
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id as client_facility_id,
  f.name as facility_name,
  c.deleted as client_deleted
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.name;

-- 1.2. Check all users and their facilities
SELECT 
  u.id as user_id,
  u.email,
  u.display_name,
  ufr.facility_id,
  f.name as facility_name,
  ufr.role,
  ufr.deleted as role_deleted
FROM users u
JOIN user_facility_roles ufr ON u.id = ufr.user_id
JOIN facilities f ON ufr.facility_id = f.id
WHERE ufr.deleted = FALSE
  AND u.email IN ('kanjinagatomi99@gmail.com', 'nivers.nagatomi@gmail.com')
ORDER BY u.email, f.name;

-- 1.3. Check all facilities
SELECT 
  id,
  name,
  type,
  deleted
FROM facilities
WHERE deleted = FALSE
ORDER BY name;

-- Step 2: Fix - Update clients to match the correct facility
-- Find the facility ID that both users belong to
-- Then update all clients to that facility

-- First, find the common facility ID for both users
DO $$
DECLARE
  target_facility_id UUID;
  old_facility_id UUID;
BEGIN
  -- Find the facility that both users belong to (永富デイサービス(テスト))
  SELECT f.id INTO target_facility_id
  FROM facilities f
  JOIN user_facility_roles ufr1 ON f.id = ufr1.facility_id
  JOIN users u1 ON ufr1.user_id = u1.id
  JOIN user_facility_roles ufr2 ON f.id = ufr2.facility_id
  JOIN users u2 ON ufr2.user_id = u2.id
  WHERE u1.email = 'kanjinagatomi99@gmail.com'
    AND u2.email = 'nivers.nagatomi@gmail.com'
    AND f.name LIKE '%永富デイサービス%'
    AND f.deleted = FALSE
    AND ufr1.deleted = FALSE
    AND ufr2.deleted = FALSE
  LIMIT 1;

  -- If no common facility found, use the facility from the original user
  IF target_facility_id IS NULL THEN
    SELECT ufr.facility_id INTO target_facility_id
    FROM users u
    JOIN user_facility_roles ufr ON u.id = ufr.user_id
    WHERE u.email = 'kanjinagatomi99@gmail.com'
      AND ufr.deleted = FALSE
    LIMIT 1;
  END IF;

  -- Find the old facility ID (where clients currently are)
  SELECT DISTINCT c.facility_id INTO old_facility_id
  FROM clients c
  WHERE c.deleted = FALSE
    AND c.facility_id != target_facility_id
  LIMIT 1;

  -- Update clients to the correct facility
  IF target_facility_id IS NOT NULL AND old_facility_id IS NOT NULL THEN
    UPDATE clients
    SET 
      facility_id = target_facility_id,
      updated_at = NOW()
    WHERE facility_id = old_facility_id
      AND deleted = FALSE;

    RAISE NOTICE 'Updated clients from facility % to facility %', old_facility_id, target_facility_id;
  ELSE
    RAISE NOTICE 'Could not determine facility IDs. target_facility_id: %, old_facility_id: %', target_facility_id, old_facility_id;
  END IF;
END $$;

-- Step 3: Verify - Check the results
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id as client_facility_id,
  f.name as facility_name,
  COUNT(DISTINCT ufr.user_id) as user_count
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
LEFT JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id AND ufr.deleted = FALSE
WHERE c.deleted = FALSE
GROUP BY c.id, c.name, c.facility_id, f.name
ORDER BY c.name;



