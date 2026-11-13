REVOKE SELECT ON public.student_profiles FROM authenticated;
GRANT SELECT (user_id, first_name, last_name, school, program, year_level, profile_image, bio, is_banned, created_at, updated_at) ON public.student_profiles TO authenticated;
REVOKE UPDATE ON public.student_profiles FROM authenticated;
GRANT UPDATE (first_name, last_name, school, program, year_level, profile_image, bio) ON public.student_profiles TO authenticated;

CREATE POLICY "Signed-in students can view marketplace listing photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'camflea-listings');
CREATE POLICY "Students upload photos to their own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'camflea-listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students replace their own listing photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'camflea-listings' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'camflea-listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students remove their own listing photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'camflea-listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.create_marketplace_student_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  INSERT INTO public.student_profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'Student'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_marketplace_student_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created_marketplace_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_marketplace_student_profile();
