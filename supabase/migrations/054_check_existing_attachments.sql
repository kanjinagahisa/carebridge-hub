-- Check existing attachments and their file_url format
-- This will help identify if file_url contains signed URLs or storage paths

SELECT 
  a.id,
  a.post_id,
  a.file_url,
  a.file_name,
  a.file_type,
  a.created_at,
  CASE 
    WHEN a.file_url LIKE 'http://%' OR a.file_url LIKE 'https://%' THEN 'Signed URL (expired)'
    WHEN a.file_url LIKE '%/%' AND NOT (a.file_url LIKE 'http://%' OR a.file_url LIKE 'https://%') THEN 'Storage Path'
    ELSE 'Unknown Format'
  END as url_type,
  -- Extract storage path if it's a signed URL (this is just for reference, we can't reliably extract it)
  CASE 
    WHEN a.file_url LIKE '%/%' AND NOT (a.file_url LIKE 'http://%' OR a.file_url LIKE 'https://%') THEN a.file_url
    ELSE NULL
  END as possible_storage_path
FROM attachments a
WHERE a.deleted = FALSE
ORDER BY a.created_at DESC
LIMIT 20;



