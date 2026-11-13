BEGIN;

ALTER TABLE public.marketplace_account_status
  ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS marketplace_account_status_warning_idx
  ON public.marketplace_account_status (warning_count DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS marketplace_listings_admin_flags_idx
  ON public.marketplace_listings (is_pinned DESC, is_verified DESC, created_at DESC);

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
    COALESCE(account.status, 'active'),
    account.reason,
    COALESCE(account.warning_count, 0),
    profile.created_at,
    profile.updated_at
  FROM public.student_profiles AS profile
  JOIN auth.users AS auth_user ON auth_user.id = profile.user_id
  LEFT JOIN public.marketplace_account_status AS account ON account.user_id = profile.user_id
  ORDER BY profile.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_warn_user(_user_id UUID, _reason TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  next_warning_count INTEGER;
  current_status TEXT;
  clean_reason TEXT := NULLIF(trim(COALESCE(_reason, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can warn users';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot warn their own account';
  END IF;
  IF clean_reason IS NOT NULL AND length(clean_reason) > 500 THEN
    RAISE EXCEPTION 'The warning reason is too long';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT COALESCE(status, 'active'), COALESCE(warning_count, 0) + 1
    INTO current_status, next_warning_count
  FROM public.marketplace_account_status
  WHERE user_id = _user_id;

  IF current_status IS NULL THEN
    current_status := 'active';
    next_warning_count := 1;
  END IF;

  INSERT INTO public.marketplace_account_status (user_id, status, reason, warning_count, changed_by)
  VALUES (_user_id, current_status, clean_reason, next_warning_count, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET
    reason = EXCLUDED.reason,
    warning_count = EXCLUDED.warning_count,
    changed_by = EXCLUDED.changed_by,
    updated_at = now();

  INSERT INTO public.marketplace_audit_log (actor_id, action, target_type, target_id, reason, metadata_summary)
  VALUES (
    auth.uid(),
    'warn_user',
    'user',
    _user_id,
    clean_reason,
    jsonb_build_object('warning_count', next_warning_count)
  );

  RETURN next_warning_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  _user_id UUID,
  _status TEXT,
  _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_reason TEXT := NULLIF(trim(COALESCE(_reason, '')), '');
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
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.marketplace_account_status (user_id, status, reason, changed_by)
  VALUES (_user_id, _status, clean_reason, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    reason = EXCLUDED.reason,
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
    jsonb_build_object('status', _status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_listing_flags(
  _listing_id UUID,
  _is_pinned BOOLEAN,
  _is_verified BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can feature listings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.marketplace_listings WHERE id = _listing_id) THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  UPDATE public.marketplace_listings
  SET is_pinned = _is_pinned, is_verified = _is_verified, updated_at = now()
  WHERE id = _listing_id;

  INSERT INTO public.marketplace_audit_log (actor_id, action, target_type, target_id, metadata_summary)
  VALUES (
    auth.uid(),
    'set_listing_flags',
    'listing',
    _listing_id,
    jsonb_build_object('is_pinned', _is_pinned, 'is_verified', _is_verified)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_listing(_listing_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_reason TEXT := NULLIF(trim(COALESCE(_reason, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can remove listings';
  END IF;
  IF clean_reason IS NOT NULL AND length(clean_reason) > 500 THEN
    RAISE EXCEPTION 'The removal reason is too long';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.marketplace_listings WHERE id = _listing_id) THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  DELETE FROM public.marketplace_listings WHERE id = _listing_id;

  INSERT INTO public.marketplace_audit_log (actor_id, action, target_type, target_id, reason)
  VALUES (auth.uid(), 'delete_listing', 'listing', _listing_id, clean_reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_student_profiles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_warn_user(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_listing_flags(UUID, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_listing(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_student_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_warn_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_listing_flags(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_listing(UUID, TEXT) TO authenticated;

COMMIT;
