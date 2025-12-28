-- Fix Storage RLS policies for reading attachments
-- Ensure the SELECT policy correctly evaluates for Server Components

-- Drop existing read policy
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can read files from attachments bucket
-- Simplified and more reliable approach
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Check if path starts with a valid client_id from user's facility
    -- Use explicit type casting and ensure the comparison works correctly
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = (split_part((storage.objects.name)::text, '/', 1))
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
      WHERE g.id::text = (split_part((storage.objects.name)::text, '/', 1))
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);




