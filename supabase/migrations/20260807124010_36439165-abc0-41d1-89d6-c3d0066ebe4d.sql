DROP POLICY IF EXISTS "Public Access to Logos" ON storage.objects;
CREATE POLICY "Public Access to Logos" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'activities' AND (storage.foldername(name))[1] = 'logos');

DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'activities' 
        AND (storage.foldername(name))[1] = 'logos'
    );

DROP POLICY IF EXISTS "Users can update their own team logos" ON storage.objects;
CREATE POLICY "Users can update their own team logos" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'activities' 
        AND (storage.foldername(name))[1] = 'logos'
    );
