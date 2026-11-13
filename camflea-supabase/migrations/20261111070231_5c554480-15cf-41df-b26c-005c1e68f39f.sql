ALTER FUNCTION public.create_marketplace_student_profile() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.create_marketplace_student_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_student_profile() TO service_role;

CREATE POLICY "Marketplace listing photo links can be signed for viewing" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'camflea-listings');