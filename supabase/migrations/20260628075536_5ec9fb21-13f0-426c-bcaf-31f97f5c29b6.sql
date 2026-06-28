
DROP POLICY IF EXISTS "Admins upload app downloads" ON storage.objects;
CREATE POLICY "Admins upload app downloads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-downloads' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')));

DROP POLICY IF EXISTS "Admins update app downloads" ON storage.objects;
CREATE POLICY "Admins update app downloads" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'app-downloads' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')));

DROP POLICY IF EXISTS "Admins delete app downloads" ON storage.objects;
CREATE POLICY "Admins delete app downloads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'app-downloads' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'content_manager')));
