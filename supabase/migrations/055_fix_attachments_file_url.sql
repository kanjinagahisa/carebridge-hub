-- Fix existing attachments: Convert signed URLs to storage paths
-- This migration updates attachments that have signed URLs stored in file_url
-- to use storage paths instead (format: {client_id}/{filename})

-- Step 1: Update attachments that have signed URLs
-- Use client_id and file_name to reconstruct the storage path
UPDATE attachments
SET file_url = client_id::text || '/' || file_name
WHERE (file_url LIKE 'http://%' OR file_url LIKE 'https://%')
  AND client_id IS NOT NULL
  AND file_name IS NOT NULL
  AND deleted = FALSE;

-- Step 2: Verify the update
-- Check how many attachments were updated
SELECT 
  COUNT(*) as updated_count,
  COUNT(CASE WHEN file_url LIKE 'http://%' OR file_url LIKE 'https://%' THEN 1 END) as still_signed_url_count,
  COUNT(CASE WHEN file_url LIKE '%/%' AND NOT (file_url LIKE 'http://%' OR file_url LIKE 'https://%') THEN 1 END) as storage_path_count
FROM attachments
WHERE deleted = FALSE;

-- Step 3: Show sample of updated attachments
SELECT 
  id,
  post_id,
  client_id,
  file_name,
  file_url,
  CASE 
    WHEN file_url LIKE 'http://%' OR file_url LIKE 'https://%' THEN 'Signed URL'
    WHEN file_url LIKE '%/%' AND NOT (file_url LIKE 'http://%' OR file_url LIKE 'https://%') THEN 'Storage Path'
    ELSE 'Unknown'
  END as url_type
FROM attachments
WHERE deleted = FALSE
ORDER BY created_at DESC
LIMIT 10;



