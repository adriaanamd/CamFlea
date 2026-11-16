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

CREATE OR REPLACE FUNCTION public.marketplace_add_to_cart(_listing_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing_row public.marketplace_listings%ROWTYPE;
  transaction_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to add items to your cart';
  END IF;
  IF public.marketplace_effective_account_status(auth.uid()) <> 'active' THEN
    RAISE EXCEPTION 'This account cannot use marketplace actions';
  END IF;

  SELECT * INTO listing_row
  FROM public.marketplace_listings
  WHERE id = _listing_id AND status = 'available'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This listing is no longer available';
  END IF;
  IF listing_row.seller_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot add your own listing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.marketplace_transactions
    WHERE listing_id = _listing_id
      AND buyer_id = auth.uid()
      AND status IN ('cart', 'requested', 'sent', 'received')
  ) THEN
    RAISE EXCEPTION 'This listing is already in your cart or purchase list';
  END IF;

  INSERT INTO public.marketplace_transactions (
    buyer_id, seller_id, listing_id, status,
    listing_title_snapshot, price_type_snapshot, price_snapshot, price_min_snapshot, price_max_snapshot
  )
  VALUES (
    auth.uid(), listing_row.seller_id, listing_row.id, 'cart',
    listing_row.title, listing_row.price_type, listing_row.price, listing_row.price_min, listing_row.price_max
  )
  RETURNING id INTO transaction_id;

  RETURN transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_request_purchase(_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_row public.marketplace_transactions%ROWTYPE;
  listing_row public.marketplace_listings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.marketplace_effective_account_status(auth.uid()) <> 'active' THEN
    RAISE EXCEPTION 'This account cannot use marketplace actions';
  END IF;

  SELECT * INTO transaction_row
  FROM public.marketplace_transactions
  WHERE id = _transaction_id AND buyer_id = auth.uid() AND status = 'cart'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart item is no longer available';
  END IF;

  SELECT * INTO listing_row
  FROM public.marketplace_listings
  WHERE id = transaction_row.listing_id AND status = 'available'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This listing is no longer available';
  END IF;

  UPDATE public.marketplace_transactions
  SET status = 'requested', updated_at = now()
  WHERE id = transaction_row.id;

  UPDATE public.marketplace_listings
  SET status = 'reserved', updated_at = now()
  WHERE id = listing_row.id;

  INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
  VALUES (listing_row.seller_id, auth.uid(), listing_row.id, 'purchase_request', 'A student requested to buy your listing.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marketplace_add_to_cart(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_request_purchase(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_add_to_cart(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_request_purchase(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_send_message(
  _recipient_id UUID,
  _listing_id UUID,
  _body TEXT,
  _attachments TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = _recipient_id THEN
    RAISE EXCEPTION 'This message recipient is not allowed';
  END IF;
  IF length(trim(_body)) < 1 OR length(_body) > 2000 THEN
    RAISE EXCEPTION 'Message body must be between 1 and 2000 characters';
  END IF;
  IF cardinality(COALESCE(_attachments, ARRAY[]::TEXT[])) > 5 THEN
    RAISE EXCEPTION 'You can attach up to five files';
  END IF;
  IF public.marketplace_effective_account_status(auth.uid()) <> 'active' THEN
    RAISE EXCEPTION 'This account cannot send messages';
  END IF;
  IF _listing_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.marketplace_listings AS listing
    WHERE listing.id = _listing_id
      AND (
        listing.status = 'available'
        OR listing.seller_id IN (auth.uid(), _recipient_id)
        OR EXISTS (
          SELECT 1
          FROM public.marketplace_transactions AS transaction_row
          WHERE transaction_row.listing_id = listing.id
            AND (transaction_row.buyer_id = auth.uid() OR transaction_row.seller_id = auth.uid())
        )
      )
  ) THEN
    RAISE EXCEPTION 'This listing conversation is not available';
  END IF;

  INSERT INTO public.marketplace_messages (sender_id, recipient_id, listing_id, body, attachments)
  VALUES (auth.uid(), _recipient_id, _listing_id, trim(_body), COALESCE(_attachments, ARRAY[]::TEXT[]))
  RETURNING id INTO message_id;

  INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
  VALUES (_recipient_id, auth.uid(), _listing_id, 'new_message', 'You have a new CamFlea message.');

  RETURN message_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marketplace_send_message(UUID, UUID, TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_send_message(UUID, UUID, TEXT, TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_transition_transaction(
  _transaction_id UUID,
  _action TEXT,
  _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_row public.marketplace_transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.marketplace_effective_account_status(auth.uid()) <> 'active' THEN
    RAISE EXCEPTION 'This account cannot use marketplace actions';
  END IF;

  SELECT * INTO transaction_row
  FROM public.marketplace_transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  PERFORM 1
  FROM public.marketplace_listings
  WHERE id = transaction_row.listing_id
  FOR UPDATE;

  IF _action = 'accept' AND auth.uid() = transaction_row.seller_id AND transaction_row.status = 'requested' THEN
    UPDATE public.marketplace_transactions
    SET status = 'sent', updated_at = now()
    WHERE id = transaction_row.id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
    VALUES (transaction_row.buyer_id, auth.uid(), transaction_row.listing_id, 'purchase_accepted', 'The seller accepted your purchase request.');
  ELSIF _action = 'received' AND auth.uid() = transaction_row.buyer_id AND transaction_row.status = 'sent' THEN
    UPDATE public.marketplace_transactions
    SET status = 'received', updated_at = now()
    WHERE id = transaction_row.id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
    VALUES (transaction_row.seller_id, auth.uid(), transaction_row.listing_id, 'item_received', 'The buyer marked the item as received.');
  ELSIF _action = 'complete' AND auth.uid() = transaction_row.seller_id AND transaction_row.status = 'received' THEN
    UPDATE public.marketplace_transactions
    SET status = 'completed', updated_at = now()
    WHERE id = transaction_row.id;
    UPDATE public.marketplace_listings
    SET status = 'sold', updated_at = now()
    WHERE id = transaction_row.listing_id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
    VALUES (transaction_row.buyer_id, auth.uid(), transaction_row.listing_id, 'transaction_completed', 'Your transaction is complete.');
  ELSIF _action = 'cancel' AND auth.uid() IN (transaction_row.buyer_id, transaction_row.seller_id)
    AND transaction_row.status IN ('cart', 'requested', 'sent', 'received') THEN
    UPDATE public.marketplace_transactions
    SET status = 'cancelled', cancellation_reason = NULLIF(trim(_reason), ''), updated_at = now()
    WHERE id = transaction_row.id;
    UPDATE public.marketplace_listings
    SET status = 'available', updated_at = now()
    WHERE id = transaction_row.listing_id AND status = 'reserved';
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
    VALUES (
      CASE WHEN auth.uid() = transaction_row.buyer_id THEN transaction_row.seller_id ELSE transaction_row.buyer_id END,
      auth.uid(), transaction_row.listing_id, 'transaction_cancelled',
      COALESCE(NULLIF(trim(_reason), ''), 'A purchase request was cancelled.')
    );
  ELSE
    RAISE EXCEPTION 'This transaction action is not allowed for your transaction';
  END IF;

  INSERT INTO public.marketplace_audit_log (actor_id, action, target_type, target_id, reason)
  VALUES (auth.uid(), _action, 'transaction', transaction_row.id, NULLIF(trim(_reason), ''));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marketplace_transition_transaction(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_transition_transaction(UUID, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Buyers create their own cart entries" ON public.marketplace_transactions;
CREATE POLICY "Buyers create their own cart entries" ON public.marketplace_transactions
FOR INSERT TO authenticated
WITH CHECK (
  buyer_id = auth.uid()
  AND buyer_id <> seller_id
  AND status = 'cart'
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Participants can update transactions" ON public.marketplace_transactions;
CREATE POLICY "Participants can update transactions" ON public.marketplace_transactions
FOR UPDATE TO authenticated
USING (
  (buyer_id = auth.uid() OR seller_id = auth.uid())
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
)
WITH CHECK (
  (buyer_id = auth.uid() OR seller_id = auth.uid())
  AND public.marketplace_effective_account_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Buyers can reserve their requested listings" ON public.marketplace_listings;
CREATE POLICY "Buyers can reserve their requested listings" ON public.marketplace_listings
FOR UPDATE TO authenticated
USING (
  public.marketplace_effective_account_status(auth.uid()) = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.marketplace_transactions AS transaction_row
    WHERE transaction_row.listing_id = id
      AND transaction_row.buyer_id = auth.uid()
      AND transaction_row.status = 'requested'
  )
)
WITH CHECK (status IN ('available', 'reserved'));

DROP POLICY IF EXISTS "Buyers can reopen their cancelled listings" ON public.marketplace_listings;
CREATE POLICY "Buyers can reopen their cancelled listings" ON public.marketplace_listings
FOR UPDATE TO authenticated
USING (
  public.marketplace_effective_account_status(auth.uid()) = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.marketplace_transactions AS transaction_row
    WHERE transaction_row.listing_id = id
      AND transaction_row.buyer_id = auth.uid()
      AND transaction_row.status = 'cancelled'
  )
)
WITH CHECK (status IN ('available', 'reserved'));

COMMIT;
