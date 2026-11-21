-- Email-verified card activation groundwork.
-- Requests do not claim cards. Finalization will require a verified Auth user.
CREATE TABLE IF NOT EXISTS public.activation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.hardware_cards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('PROFESSIONAL', 'PERSONAL')),
  activation_secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_EMAIL'
    CHECK (status IN ('PENDING_EMAIL', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  verified_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT activation_requests_slug_format
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Only one unexpired pending request per card at a time; application/RPC logic
-- must expire stale rows before creating a replacement request.
CREATE UNIQUE INDEX IF NOT EXISTS activation_requests_one_pending_per_card
  ON public.activation_requests (card_id)
  WHERE status = 'PENDING_EMAIL';

CREATE INDEX IF NOT EXISTS activation_requests_expiry_idx
  ON public.activation_requests (expires_at)
  WHERE status = 'PENDING_EMAIL';

ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.activation_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activation_requests TO service_role;
