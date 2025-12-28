-- Create attachments storage bucket
-- This migration creates the storage bucket and sets up policies for attachments

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: Storage buckets are created via Supabase Dashboard or API, not SQL
-- This is a reference migration file for documentation purposes

-- Step 2: Create storage policies for attachments bucket
-- These policies control who can read/write files in the attachments bucket

-- Policy: Authenticated users can read files from their facility's attachments
CREATE POLICY "Authenticated users can read attachments from their facilities"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if the file path contains a client_id or group_id that belongs to user's facility
    -- File path format: {client_id}/{filename} or {group_id}/{filename}
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = (storage.foldername(name))[1]
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = (storage.foldername(name))[1]
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can upload files to their facility's attachments
CREATE POLICY "Authenticated users can upload attachments to their facilities"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if the file path contains a client_id or group_id that belongs to user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = (storage.foldername(name))[1]
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = (storage.foldername(name))[1]
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from their facility's attachments
CREATE POLICY "Authenticated users can delete attachments from their facilities"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if the file path contains a client_id or group_id that belongs to user's facility
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id::text = (storage.foldername(name))[1]
        AND clients.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND clients.deleted = FALSE
    )
    OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id::text = (storage.foldername(name))[1]
        AND groups.facility_id IN (
          SELECT facility_id FROM get_user_facility_ids(auth.uid())
        )
        AND groups.deleted = FALSE
    )
  )
);

-- Note: Storage bucket creation must be done via Supabase Dashboard:
-- 1. Go to Storage > Buckets
-- 2. Click "New bucket"
-- 3. Name: "attachments"
-- 4. Public: false (private bucket)
-- 5. File size limit: 50MB (or as needed)
-- 6. Allowed MIME types: image/*, application/pdf, video/*






