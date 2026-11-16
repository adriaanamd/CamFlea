BEGIN;

ALTER TABLE public.marketplace_account_status
  ADD COLUMN IF NOT EXISTS restriction_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS marketplace_account_status_effective_idx
  ON public.marketplace_account_status(status, restriction_expires_at, updated_at DESC);
