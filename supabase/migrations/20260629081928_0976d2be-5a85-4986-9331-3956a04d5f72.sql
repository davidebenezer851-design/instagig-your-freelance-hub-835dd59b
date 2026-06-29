
CREATE POLICY "Anyone can view post-attachments"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'post-attachments');

CREATE POLICY "Users can upload to own folder in post-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own post-attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own post-attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
