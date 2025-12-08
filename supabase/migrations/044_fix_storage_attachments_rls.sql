-- Fix Storage RLS policies for attachments bucket
-- Ensure the policy correctly validates client_id from the file path

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to attachments bucket
-- File path format: {client_id}/{filename}
-- The policy checks if the first segment (client_id) belongs to a client in the user's facilities
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

-- Policy: Authenticated users can read files from attachments bucket
-- This checks the attachments table to verify facility_id
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
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

