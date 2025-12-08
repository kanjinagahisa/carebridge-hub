-- Simplified storage policies for attachments bucket
-- This version uses a simpler approach that checks facility_id from attachments table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can read files if they belong to a facility they're part of
-- This checks the attachments table to verify facility_id
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM attachments
    WHERE attachments.file_url LIKE '%' || storage.objects.name || '%'
      OR attachments.file_url LIKE '%/' || storage.objects.name
      OR storage.objects.name LIKE '%' || split_part(attachments.file_url, '/', -1) || '%'
  )
  AND EXISTS (
    SELECT 1 FROM attachments att
    WHERE (
      att.file_url LIKE '%' || storage.objects.name || '%'
      OR att.file_url LIKE '%/' || storage.objects.name
      OR storage.objects.name LIKE '%' || split_part(att.file_url, '/', -1) || '%'
    )
    AND att.facility_id IN (
      SELECT facility_id FROM get_user_facility_ids(auth.uid())
    )
    AND att.deleted = FALSE
  )
);

-- Policy: Authenticated users can upload files to attachments bucket
-- File path should be in format: {client_id}/{filename} or {group_id}/{filename}
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = split_part(name, '/', 1)
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = split_part(name, '/', 1)
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Note: Storage bucket "attachments" must be created via Supabase Dashboard:
-- 1. Go to Storage > Buckets
-- 2. Click "New bucket"
-- 3. Name: "attachments"
-- 4. Public: false (private bucket)
-- 5. File size limit: 50MB (or as needed)
-- 6. Allowed MIME types: image/*, application/pdf, video/*





