BEGIN;

ALTER TABLE public.marketplace_account_status
  ADD COLUMN IF NOT EXISTS restriction_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS marketplace_account_status_effective_idx
  ON public.marketplace_account_status(status, restriction_expires_at, updated_at DESC);

CREATE OR REPLACE FUNCTION public.marketplace_effective_account_status(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.student_profiles AS profile
      WHERE profile.user_id = _user_id AND profile.is_banned = true
    ) OR EXISTS (
      SELECT 1
      FROM public.marketplace_account_status AS account
      WHERE account.user_id = _user_id AND account.status = 'banned'
    ) THEN 'banned'
    WHEN EXISTS (
      SELECT 1
      FROM public.marketplace_account_status AS account
      WHERE account.user_id = _user_id
        AND account.status = 'restricted'
        AND (account.restriction_expires_at IS NULL OR account.restriction_expires_at > now())
    ) THEN 'restricted'
    ELSE 'active'
  END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_get_my_account_status()
RETURNS TABLE(status TEXT, reason TEXT, restriction_expires_at TIMESTAMPTZ, warning_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.marketplace_effective_account_status(auth.uid()),
         account.reason,
         account.restriction_expires_at,
         COALESCE(account.warning_count, 0)
  FROM (SELECT auth.uid() AS user_id) AS current_user
  LEFT JOIN public.marketplace_account_status AS account ON account.user_id = current_user.user_id
  WHERE current_user.user_id IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.marketplace_effective_account_status(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_get_my_account_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_effective_account_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_get_my_account_status() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_set_account_status(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  _user_id UUID,
  _status TEXT,
  _reason TEXT DEFAULT NULL,
  _restriction_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_reason TEXT := NULLIF(trim(COALESCE(_reason, '')), '');
  effective_expiration TIMESTAMPTZ := CASE WHEN _status = 'restricted' THEN _restriction_expires_at ELSE NULL END;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change account status';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot change their own account status';
  END IF;
  IF _status NOT IN ('active', 'restricted', 'banned') THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;
  IF clean_reason IS NOT NULL AND length(clean_reason) > 500 THEN
    RAISE EXCEPTION 'The account status reason is too long';
  END IF;
  IF effective_expiration IS NOT NULL AND effective_expiration <= now() THEN
    RAISE EXCEPTION 'The restriction expiration must be in the future';
  END IF;
  IF _restriction_expires_at IS NOT NULL AND _status <> 'restricted' THEN
    RAISE EXCEPTION 'Only restricted accounts can have an expiration';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.marketplace_account_status (
    user_id, status, reason, restriction_expires_at, changed_by
  )
  VALUES (_user_id, _status, clean_reason, effective_expiration, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    reason = EXCLUDED.reason,
    restriction_expires_at = EXCLUDED.restriction_expires_at,
    changed_by = EXCLUDED.changed_by,
    updated_at = now();

  UPDATE public.student_profiles
  SET is_banned = (_status = 'banned'), updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.marketplace_audit_log (actor_id, action, target_type, target_id, reason, metadata_summary)
  VALUES (
    auth.uid(),
    'set_account_status',
    'user',
    _user_id,
    clean_reason,
    jsonb_build_object('status', _status, 'restriction_expires_at', effective_expiration)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_student_profiles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  school TEXT,
  program TEXT,
  year_level TEXT,
  profile_image TEXT,
  bio TEXT,
  is_banned BOOLEAN,
  status TEXT,
  reason TEXT,
  warning_count INTEGER,
  restriction_expires_at TIMESTAMPTZ,
  listing_count INTEGER,
  available_listing_count INTEGER,
  sold_listing_count INTEGER,
  transaction_count INTEGER,
  completed_purchase_count INTEGER,
  message_count INTEGER,
  report_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can view account records';
  END IF;

  RETURN QUERY
  SELECT
    profile.user_id,
    auth_user.email::TEXT,
    profile.first_name,
    profile.last_name,
    profile.school,
    profile.program,
    profile.year_level,
    profile.profile_image,
    profile.bio,
    profile.is_banned,
    public.marketplace_effective_account_status(profile.user_id),
    account.reason,
    COALESCE(account.warning_count, 0),
    account.restriction_expires_at,
    (SELECT count(*)::INTEGER FROM public.marketplace_listings AS listing WHERE listing.seller_id = profile.user_id),
    (SELECT count(*)::INTEGER FROM public.marketplace_listings AS listing WHERE listing.seller_id = profile.user_id AND listing.status = 'available'),
    (SELECT count(*)::INTEGER FROM public.marketplace_listings AS listing WHERE listing.seller_id = profile.user_id AND listing.status = 'sold'),
    (SELECT count(*)::INTEGER FROM public.marketplace_transactions AS transaction_row WHERE transaction_row.buyer_id = profile.user_id OR transaction_row.seller_id = profile.user_id),
    (SELECT count(*)::INTEGER FROM public.marketplace_transactions AS transaction_row WHERE transaction_row.buyer_id = profile.user_id AND transaction_row.status = 'completed'),
    (SELECT count(*)::INTEGER FROM public.marketplace_messages AS message_row WHERE message_row.sender_id = profile.user_id),
    (SELECT count(*)::INTEGER FROM public.marketplace_reports AS report_row WHERE report_row.reported_user_id = profile.user_id),
    profile.created_at,
    profile.updated_at
  FROM public.student_profiles AS profile
  JOIN auth.users AS auth_user ON auth_user.id = profile.user_id
  LEFT JOIN public.marketplace_account_status AS account ON account.user_id = profile.user_id
  ORDER BY profile.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_student_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_student_profiles() TO authenticated;

DROP POLICY IF EXISTS "Students post their own listings" ON public.marketplace_listings;
CREATE POLICY "Students post their own listings" ON public.marketplace_listings
FOR INSERT TO authenticated
WITH CHECK (
  seller_id = auth.uid()
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Sellers edit their own listings" ON public.marketplace_listings;
CREATE POLICY "Sellers edit their own listings" ON public.marketplace_listings
FOR UPDATE TO authenticated
USING (
  seller_id = auth.uid()
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
)
WITH CHECK (
  seller_id = auth.uid()
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Sellers remove their own listings" ON public.marketplace_listings;
CREATE POLICY "Sellers remove their own listings" ON public.marketplace_listings
FOR DELETE TO authenticated
USING (
  seller_id = auth.uid()
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Listing media belongs to the listing owner" ON public.marketplace_listing_media;
CREATE POLICY "Listing media belongs to the listing owner" ON public.marketplace_listing_media
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.marketplace_listings AS listing
    WHERE listing.id = listing_id
      AND listing.seller_id = auth.uid()
      AND public.marketplace_effective_account_status(auth.uid()) = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.marketplace_listings AS listing
    WHERE listing.id = listing_id
      AND listing.seller_id = auth.uid()
      AND public.marketplace_effective_account_status(auth.uid()) = 'active'
  )
);

DROP POLICY IF EXISTS "Students upload photos to their own folder" ON storage.objects;
CREATE POLICY "Students upload photos to their own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'camflea-listings'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Students replace their own listing photos" ON storage.objects;
CREATE POLICY "Students replace their own listing photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'camflea-listings'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
)
WITH CHECK (
  bucket_id = 'camflea-listings'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Students remove their own listing photos" ON storage.objects;
CREATE POLICY "Students remove their own listing photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'camflea-listings'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);
