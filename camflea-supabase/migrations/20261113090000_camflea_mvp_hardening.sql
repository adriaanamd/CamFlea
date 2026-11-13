BEGIN;

ALTER TABLE public.marketplace_transactions
  ADD COLUMN IF NOT EXISTS listing_title_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS price_type_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS price_snapshot NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS price_min_snapshot NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS price_max_snapshot NUMERIC(10, 2);

UPDATE public.marketplace_transactions AS transaction_row
SET
  listing_title_snapshot = listing.title,
  price_type_snapshot = listing.price_type,
  price_snapshot = listing.price,
  price_min_snapshot = listing.price_min,
  price_max_snapshot = listing.price_max
FROM public.marketplace_listings AS listing
WHERE listing.id = transaction_row.listing_id
  AND transaction_row.listing_title_snapshot IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_listings_price_type_check'
      AND conrelid = 'public.marketplace_listings'::regclass
  ) THEN
    ALTER TABLE public.marketplace_listings
      ADD CONSTRAINT marketplace_listings_price_type_check
      CHECK (price_type IN ('single', 'range', 'hidden')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_transactions_status_check'
      AND conrelid = 'public.marketplace_transactions'::regclass
  ) THEN
    ALTER TABLE public.marketplace_transactions
      ADD CONSTRAINT marketplace_transactions_status_check
      CHECK (status IN ('cart', 'requested', 'sent', 'received', 'completed', 'cancelled')) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.marketplace_listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  ordering INTEGER NOT NULL CHECK (ordering BETWEEN 0 AND 4),
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  upload_status TEXT NOT NULL DEFAULT 'ready' CHECK (upload_status IN ('pending', 'ready', 'quarantined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, ordering)
);

CREATE TABLE IF NOT EXISTS public.marketplace_account_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'banned')),
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT,
  metadata_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_account_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_audit_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.marketplace_listing_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketplace_listing_media TO authenticated;
GRANT SELECT ON public.marketplace_account_status TO authenticated;
GRANT SELECT ON public.marketplace_audit_log TO authenticated;
GRANT ALL ON public.marketplace_listing_media, public.marketplace_account_status, public.marketplace_audit_log TO service_role;

DROP POLICY IF EXISTS "Marketplace listing photo links can be signed for viewing" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in students can view marketplace listing photos" ON storage.objects;

CREATE POLICY "Authorized viewers can read listing photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'camflea-listings'
  AND EXISTS (
    SELECT 1
    FROM public.marketplace_listing_media AS media
    JOIN public.marketplace_listings AS listing ON listing.id = media.listing_id
    WHERE media.storage_path = name
      AND (
        listing.status = 'available'
        OR listing.seller_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.marketplace_transactions AS transaction_row
          WHERE transaction_row.listing_id = listing.id
            AND (transaction_row.buyer_id = auth.uid() OR transaction_row.seller_id = auth.uid())
        )
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'moderator')
      )
  )
);

DROP POLICY IF EXISTS "Listing media belongs to the listing owner" ON public.marketplace_listing_media;
CREATE POLICY "Listing media belongs to the listing owner"
ON public.marketplace_listing_media FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings AS listing
    WHERE listing.id = listing_id AND listing.seller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings AS listing
    WHERE listing.id = listing_id AND listing.seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their account status" ON public.marketplace_account_status;
CREATE POLICY "Users can view their account status"
ON public.marketplace_account_status FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "Staff can view audit records" ON public.marketplace_audit_log;
CREATE POLICY "Staff can view audit records"
ON public.marketplace_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS marketplace_listing_media_listing_order_idx
  ON public.marketplace_listing_media(listing_id, ordering);
CREATE INDEX IF NOT EXISTS marketplace_account_status_status_idx
  ON public.marketplace_account_status(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketplace_audit_log_target_idx
  ON public.marketplace_audit_log(target_type, target_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_transactions_active_listing_idx
  ON public.marketplace_transactions(listing_id)
  WHERE status IN ('requested', 'sent', 'received');

REVOKE UPDATE ON public.marketplace_transactions FROM authenticated;
REVOKE UPDATE ON public.marketplace_notifications FROM authenticated;
REVOKE UPDATE ON public.marketplace_messages FROM authenticated;
REVOKE INSERT ON public.marketplace_notifications FROM authenticated;
REVOKE INSERT ON public.marketplace_messages FROM authenticated;

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

  IF EXISTS (
    SELECT 1 FROM public.marketplace_account_status
    WHERE user_id = auth.uid() AND status IN ('restricted', 'banned')
  ) OR EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE user_id = auth.uid() AND is_banned = true
  ) THEN
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
    UPDATE public.marketplace_transactions SET status = 'sent', updated_at = now() WHERE id = transaction_row.id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
    VALUES (transaction_row.buyer_id, auth.uid(), transaction_row.listing_id, 'purchase_accepted', 'The seller accepted your purchase request.');
  ELSIF _action = 'received' AND auth.uid() = transaction_row.buyer_id AND transaction_row.status = 'sent' THEN
    UPDATE public.marketplace_transactions SET status = 'received', updated_at = now() WHERE id = transaction_row.id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content)
    VALUES (transaction_row.seller_id, auth.uid(), transaction_row.listing_id, 'item_received', 'The buyer marked the item as received.');
  ELSIF _action = 'complete' AND auth.uid() = transaction_row.seller_id AND transaction_row.status = 'received' THEN
    UPDATE public.marketplace_transactions SET status = 'completed', updated_at = now() WHERE id = transaction_row.id;
    UPDATE public.marketplace_listings SET status = 'sold', updated_at = now() WHERE id = transaction_row.listing_id;
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

CREATE OR REPLACE FUNCTION public.marketplace_mark_notification_read(_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketplace_notifications
  SET is_read = true, updated_at = now()
  WHERE id = _notification_id AND recipient_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.marketplace_notifications
  SET is_read = true, updated_at = now()
  WHERE recipient_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

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
  IF EXISTS (
    SELECT 1 FROM public.marketplace_account_status
    WHERE user_id = auth.uid() AND status IN ('restricted', 'banned')
  ) THEN
    RAISE EXCEPTION 'This account cannot send messages';
  END IF;
  IF _listing_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.marketplace_listings AS listing
    WHERE listing.id = _listing_id
      AND (
        listing.status = 'available'
        OR listing.seller_id IN (auth.uid(), _recipient_id)
        OR EXISTS (
          SELECT 1 FROM public.marketplace_transactions AS transaction_row
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

CREATE OR REPLACE FUNCTION public.marketplace_mark_thread_read(_sender_id UUID, _listing_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.marketplace_messages
  SET is_read = true, updated_at = now()
  WHERE recipient_id = auth.uid()
    AND sender_id = _sender_id
    AND (_listing_id IS NULL OR listing_id = _listing_id)
    AND is_read = false;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marketplace_add_to_cart(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_request_purchase(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_transition_transaction(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_mark_notification_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_mark_all_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_send_message(UUID, UUID, TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketplace_mark_thread_read(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.marketplace_add_to_cart(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_request_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_transition_transaction(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_send_message(UUID, UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_mark_thread_read(UUID, UUID) TO authenticated;

UPDATE storage.buckets
SET public = false
WHERE id = 'camflea-listings';

COMMIT;
