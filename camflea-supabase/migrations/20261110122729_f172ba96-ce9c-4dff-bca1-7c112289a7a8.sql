CREATE TABLE public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  school TEXT,
  program TEXT,
  year_level TEXT,
  profile_image TEXT,
  bio TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are visible to signed-in students" ON public.student_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students create their own profile" ON public.student_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Students edit their own profile" ON public.student_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;

CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'single',
  price NUMERIC(10,2),
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  photos TEXT[] NOT NULL DEFAULT '{}',
  meeting_place TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Available listings are public and owners see their listings" ON public.marketplace_listings FOR SELECT USING (status = 'available' OR seller_id = auth.uid() OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Students post their own listings" ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Sellers edit their own listings" ON public.marketplace_listings FOR UPDATE TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Sellers remove their own listings" ON public.marketplace_listings FOR DELETE TO authenticated USING (seller_id = auth.uid());

CREATE TABLE public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'cart',
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.marketplace_transactions TO authenticated;
GRANT ALL ON public.marketplace_transactions TO service_role;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transaction participants can view their transactions" ON public.marketplace_transactions FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers create their own cart entries" ON public.marketplace_transactions FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() AND buyer_id <> seller_id AND status = 'cart');
CREATE POLICY "Participants can update transactions" ON public.marketplace_transactions FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid()) WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE TABLE public.marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments TEXT[] NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.marketplace_messages TO authenticated;
GRANT ALL ON public.marketplace_messages TO service_role;
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message participants can view conversation" ON public.marketplace_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Signed-in students send messages as themselves" ON public.marketplace_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND sender_id <> recipient_id);
CREATE POLICY "Recipients mark their messages read" ON public.marketplace_messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE TABLE public.marketplace_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.marketplace_notifications TO authenticated;
GRANT ALL ON public.marketplace_notifications TO service_role;
ALTER TABLE public.marketplace_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view and update their notifications" ON public.marketplace_notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Students update their notifications" ON public.marketplace_notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE TABLE public.marketplace_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.marketplace_reports TO authenticated;
GRANT ALL ON public.marketplace_reports TO service_role;
ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters and admins view reports" ON public.marketplace_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students create reports as themselves" ON public.marketplace_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins manage reports" ON public.marketplace_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.marketplace_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.marketplace_feedback TO authenticated;
GRANT ALL ON public.marketplace_feedback TO service_role;
ALTER TABLE public.marketplace_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit feedback as themselves" ON public.marketplace_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view their own feedback" ON public.marketplace_feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.marketplace_add_to_cart(_listing_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller UUID; v_transaction UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to add items to your cart'; END IF;
  SELECT seller_id INTO v_seller FROM public.marketplace_listings WHERE id = _listing_id AND status = 'available' FOR UPDATE;
  IF v_seller IS NULL THEN RAISE EXCEPTION 'This listing is no longer available'; END IF;
  IF v_seller = auth.uid() THEN RAISE EXCEPTION 'You cannot add your own listing'; END IF;
  IF EXISTS (SELECT 1 FROM public.marketplace_transactions WHERE listing_id = _listing_id AND buyer_id = auth.uid() AND status IN ('cart','requested','sent','received')) THEN
    RAISE EXCEPTION 'This listing is already in your cart or purchase list';
  END IF;
  INSERT INTO public.marketplace_transactions (buyer_id, seller_id, listing_id, status) VALUES (auth.uid(), v_seller, _listing_id, 'cart') RETURNING id INTO v_transaction;
  RETURN v_transaction;
END $$;
GRANT EXECUTE ON FUNCTION public.marketplace_add_to_cart(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_request_purchase(_transaction_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_listing UUID; v_seller UUID;
BEGIN
  UPDATE public.marketplace_transactions SET status = 'requested', updated_at = now() WHERE id = _transaction_id AND buyer_id = auth.uid() AND status = 'cart' RETURNING listing_id, seller_id INTO v_listing, v_seller;
  IF v_listing IS NULL THEN RAISE EXCEPTION 'Cart item is no longer available'; END IF;
  UPDATE public.marketplace_listings SET status = 'reserved', updated_at = now() WHERE id = v_listing AND status = 'available';
  IF NOT FOUND THEN RAISE EXCEPTION 'This listing is no longer available'; END IF;
  INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content) VALUES (v_seller, auth.uid(), v_listing, 'purchase_request', 'A student requested to buy your listing.');
END $$;
GRANT EXECUTE ON FUNCTION public.marketplace_request_purchase(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_transition_transaction(_transaction_id UUID, _action TEXT, _reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.marketplace_transactions%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.marketplace_transactions WHERE id = _transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF _action = 'accept' AND auth.uid() = t.seller_id AND t.status = 'requested' THEN
    UPDATE public.marketplace_transactions SET status = 'sent', updated_at = now() WHERE id = t.id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content) VALUES (t.buyer_id, auth.uid(), t.listing_id, 'purchase_accepted', 'The seller accepted your purchase request.');
  ELSIF _action = 'received' AND auth.uid() = t.buyer_id AND t.status = 'sent' THEN
    UPDATE public.marketplace_transactions SET status = 'received', updated_at = now() WHERE id = t.id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content) VALUES (t.seller_id, auth.uid(), t.listing_id, 'item_received', 'The buyer marked the item as received.');
  ELSIF _action = 'complete' AND auth.uid() = t.seller_id AND t.status = 'received' THEN
    UPDATE public.marketplace_transactions SET status = 'completed', updated_at = now() WHERE id = t.id;
    UPDATE public.marketplace_listings SET status = 'sold', updated_at = now() WHERE id = t.listing_id;
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content) VALUES (t.buyer_id, auth.uid(), t.listing_id, 'transaction_completed', 'Your transaction is complete.');
  ELSIF _action = 'cancel' AND auth.uid() IN (t.buyer_id, t.seller_id) AND t.status IN ('cart','requested','sent','received') THEN
    UPDATE public.marketplace_transactions SET status = 'cancelled', cancellation_reason = _reason, updated_at = now() WHERE id = t.id;
    UPDATE public.marketplace_listings SET status = 'available', updated_at = now() WHERE id = t.listing_id AND status = 'reserved';
    INSERT INTO public.marketplace_notifications (recipient_id, sender_id, listing_id, kind, content) VALUES (CASE WHEN auth.uid() = t.buyer_id THEN t.seller_id ELSE t.buyer_id END, auth.uid(), t.listing_id, 'transaction_cancelled', COALESCE(_reason, 'A purchase request was cancelled.'));
  ELSE
    RAISE EXCEPTION 'This action is not allowed for your transaction';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.marketplace_transition_transaction(UUID, TEXT, TEXT) TO authenticated;
