-- Ensure storage bucket exists
-- (We use the tool for this, but the policy needs the bucket_id)

-- Reset policies for the 'activities' bucket
DROP POLICY IF EXISTS "Public Read Access to Activities Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to Activities Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update/Delete in Activities Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own team logos" ON storage.objects;

-- 1. Public Read Access: Everyone can see the logos
CREATE POLICY "Public Read Access to Activities Bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'activities');

-- 2. Authenticated Upload: Any signed-in user can upload
-- In a multi-tenant app, we'd ideally restrict by team, but first we ensure it works.
CREATE POLICY "Authenticated Upload to Activities Bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activities');

-- 3. Authenticated Update/Delete: Owners (authenticated users) can manage files
CREATE POLICY "Authenticated Update/Delete in Activities Bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'activities')
WITH CHECK (bucket_id = 'activities');

-- Grant necessary permissions to the roles
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;
