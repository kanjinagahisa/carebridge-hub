-- Fix clients facility_id mismatch
-- This migration updates clients that belong to the wrong facility
-- to ensure they are associated with the correct facility

-- First, let's identify the issue:
-- Some clients have facility_id = '02d82252-40be-4ad6-98c7-42ecd1841555'
-- but should belong to facility_id = '143731d4-4f02-440e-b84e-7b3e598ceca2'
-- (永富デイサービス(テスト))

-- Update clients to the correct facility
-- Only update if the facility name matches "永富デイサービス(テスト)"
UPDATE clients
SET 
  facility_id = '143731d4-4f02-440e-b84e-7b3e598ceca2'::uuid,
  updated_at = NOW()
WHERE facility_id = '02d82252-40be-4ad6-98c7-42ecd1841555'::uuid
  AND deleted = FALSE
  AND EXISTS (
    SELECT 1 FROM facilities f
    WHERE f.id = '143731d4-4f02-440e-b84e-7b3e598ceca2'::uuid
      AND f.name LIKE '%永富デイサービス%'
      AND f.deleted = FALSE
  );

-- Also update related posts to ensure consistency
UPDATE posts
SET 
  updated_at = NOW()
WHERE client_id IN (
  SELECT id FROM clients
  WHERE facility_id = '143731d4-4f02-440e-b84e-7b3e598ceca2'::uuid
    AND deleted = FALSE
)
AND deleted = FALSE;



