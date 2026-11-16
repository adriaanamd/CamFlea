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
