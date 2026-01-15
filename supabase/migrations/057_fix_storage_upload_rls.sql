-- Fix Storage RLS policies for attachments bucket
-- Ensure uploads work correctly by simplifying the policy check

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to attachments bucket
-- File path format: {client_id}/{filename} or {group_id}/{filename}
-- Simplified check: verify that the client_id or group_id exists and belongs to user's facility
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can read files from attachments bucket
-- Same logic as INSERT policy
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- Check if path starts with a valid group_id from user's facility
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);




