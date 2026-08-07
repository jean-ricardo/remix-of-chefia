-- Ensure storage bucket exists (this is a common name in this project)
INSERT INTO storage.buckets (id, name, public)
VALUES ('activities', 'activities', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for logo uploads
CREATE POLICY "Public Access to Logos" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'activities' AND (storage.foldername(name))[1] = 'logos');

CREATE POLICY "Authenticated users can upload logos" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'activities' 
        AND (storage.foldername(name))[1] = 'logos'
    );

CREATE POLICY "Users can update their own team logos" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'activities' 
        AND (storage.foldername(name))[1] = 'logos'
    );
