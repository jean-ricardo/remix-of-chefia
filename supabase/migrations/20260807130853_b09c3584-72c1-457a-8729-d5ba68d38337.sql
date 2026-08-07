-- Use update tool for bucket settings as per instructions
-- But RLS policies must be here.

-- Ensure bucket is listed in public if possible via policies
-- Actually the storage_update_bucket tool should handle the public flag.

-- Re-apply policies to be safe after bucket creation
DROP POLICY IF EXISTS "Public Read Access to Activities Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to Activities Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update/Delete in Activities Bucket" ON storage.objects;

-- Policy for Public Read Access (works even if bucket is private if this policy exists)
CREATE POLICY "Public Read Access to Activities Bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'activities');

-- Policy for Authenticated Uploads
CREATE POLICY "Authenticated Upload to Activities Bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activities');

-- Policy for Authenticated Updates/Deletes
CREATE POLICY "Authenticated Update/Delete in Activities Bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'activities')
WITH CHECK (bucket_id = 'activities');
