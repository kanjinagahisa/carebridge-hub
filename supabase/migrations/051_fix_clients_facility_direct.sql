-- Direct fix for clients facility_id mismatch
-- This migration directly updates clients to the correct facility
-- based on the facility that the original user (kanjinagatomi99@gmail.com) belongs to

-- Step 1: Find the correct facility ID (永富デイサービス(テスト))
-- Get the facility ID from the original user
DO $$
DECLARE
  target_facility_id UUID;
  affected_rows INTEGER;
BEGIN
  -- Find the facility ID that the original user belongs to
  SELECT ufr.facility_id INTO target_facility_id
  FROM users u
  JOIN user_facility_roles ufr ON u.id = ufr.user_id
  JOIN facilities f ON ufr.facility_id = f.id
  WHERE u.email = 'kanjinagatomi99@gmail.com'
    AND f.name LIKE '%永富デイサービス%'
    AND ufr.deleted = FALSE
    AND f.deleted = FALSE
  ORDER BY ufr.created_at ASC
  LIMIT 1;

  -- If found, update all clients to this facility
  IF target_facility_id IS NOT NULL THEN
    -- Update clients that are NOT in the target facility
    UPDATE clients
    SET 
      facility_id = target_facility_id,
      updated_at = NOW()
    WHERE facility_id != target_facility_id
      AND deleted = FALSE;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % clients to facility %', affected_rows, target_facility_id;
  ELSE
    RAISE NOTICE 'Could not find target facility for user kanjinagatomi99@gmail.com';
  END IF;
END $$;

