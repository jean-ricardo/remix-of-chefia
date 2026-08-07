-- Policies for logo uploads in 'activities' bucket
DROP POLICY IF EXISTS "Public Access to Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own team logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access to Activities Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to Activities Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update/Delete in Activities Bucket" ON storage.objects;

-- Policy for Public Read Access
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
