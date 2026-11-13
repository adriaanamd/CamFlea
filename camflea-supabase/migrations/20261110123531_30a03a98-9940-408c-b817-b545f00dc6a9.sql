ALTER FUNCTION public.has_role(UUID, TEXT) SECURITY INVOKER;
ALTER FUNCTION public.marketplace_add_to_cart(UUID) SECURITY INVOKER;
ALTER FUNCTION public.marketplace_request_purchase(UUID) SECURITY INVOKER;
ALTER FUNCTION public.marketplace_transition_transaction(UUID, TEXT, TEXT) SECURITY INVOKER;

DROP POLICY IF EXISTS "Available listings are public and owners see their listings" ON public.marketplace_listings;
CREATE POLICY "Available listings and participant listings are visible" ON public.marketplace_listings FOR SELECT USING (
  status = 'available' OR seller_id = auth.uid() OR
  (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')) OR
  EXISTS (SELECT 1 FROM public.marketplace_transactions t WHERE t.listing_id = id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid()))
);

CREATE POLICY "Buyers can reserve their requested listings" ON public.marketplace_listings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.marketplace_transactions t WHERE t.listing_id = id AND t.buyer_id = auth.uid() AND t.status = 'requested'))
WITH CHECK (status IN ('available', 'reserved'));

CREATE POLICY "Buyers can reopen their cancelled listings" ON public.marketplace_listings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.marketplace_transactions t WHERE t.listing_id = id AND t.buyer_id = auth.uid() AND t.status = 'cancelled'))
WITH CHECK (status IN ('available', 'reserved'));

CREATE POLICY "Transaction participants can create notifications" ON public.marketplace_notifications FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE INDEX IF NOT EXISTS marketplace_transactions_listing_status_idx ON public.marketplace_transactions(listing_id, status);
CREATE INDEX IF NOT EXISTS marketplace_transactions_buyer_status_idx ON public.marketplace_transactions(buyer_id, status);
CREATE INDEX IF NOT EXISTS marketplace_transactions_seller_status_idx ON public.marketplace_transactions(seller_id, status);
CREATE INDEX IF NOT EXISTS marketplace_messages_thread_idx ON public.marketplace_messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS marketplace_notifications_recipient_idx ON public.marketplace_notifications(recipient_id, created_at DESC);
