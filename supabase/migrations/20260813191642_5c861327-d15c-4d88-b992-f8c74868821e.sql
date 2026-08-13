
CREATE POLICY "admin_manage_preview_objects" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'photo-previews' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'photo-previews' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_manage_original_objects" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'photo-originals' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'photo-originals' AND public.has_role(auth.uid(),'admin'));
