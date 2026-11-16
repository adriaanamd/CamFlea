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
