-- PULSE-owned email verification tokens for card activation.
-- This migration is branch-only until reviewed and explicitly applied.
ALTER TABLE public.activation_requests
  DROP CONSTRAINT IF EXISTS activation_requests_status_check;

ALTER TABLE public.activation_requests
  ADD CONSTRAINT activation_requests_status_check
  CHECK (status IN ('PENDING_EMAIL', 'EMAIL_VERIFIED', 'AWAITING_SIGN_IN', 'COMPLETED', 'EXPIRED', 'CANCELLED'));

CREATE TABLE IF NOT EXISTS public.activation_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.activation_requests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT activation_verification_token_expiry CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS activation_verification_tokens_request_idx
  ON public.activation_verification_tokens(request_id);

CREATE UNIQUE INDEX IF NOT EXISTS activation_verification_tokens_one_live_per_request
  ON public.activation_verification_tokens(request_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.activation_verification_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.activation_verification_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activation_verification_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.issue_activation_verification_token(
  p_request_id UUID,
  p_token_hash TEXT,
  p_token_expiry TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
BEGIN
  IF p_token_hash !~ '^[a-f0-9]{64}$' OR p_token_expiry <= now() THEN
    RETURN json_build_object('error', 'Invalid token data.');
  END IF;

  SELECT id, status, expires_at
    INTO v_request
    FROM public.activation_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND OR v_request.status <> 'PENDING_EMAIL' OR v_request.expires_at <= now() THEN
    RETURN json_build_object('error', 'Activation request is unavailable.');
  END IF;

  IF p_token_expiry > v_request.expires_at THEN
    RETURN json_build_object('error', 'Token expiry cannot exceed request expiry.');
  END IF;

  UPDATE public.activation_verification_tokens
     SET revoked_at = now()
   WHERE request_id = p_request_id
     AND consumed_at IS NULL
     AND revoked_at IS NULL;

  INSERT INTO public.activation_verification_tokens (request_id, token_hash, expires_at)
  VALUES (p_request_id, p_token_hash, p_token_expiry);

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('error', 'Token could not be issued.');
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_activation_verification_token(p_token_hash TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_id UUID;
  v_request_id UUID;
  v_token RECORD;
  v_request RECORD;
BEGIN
  IF p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN json_build_object('error', 'Verification link is invalid or expired.');
  END IF;

  -- Read the request ID first without locking. Both issue and consume lock request
  -- before token rows, preventing a request/token lock-order deadlock.
  SELECT id, request_id INTO v_token_id, v_request_id
    FROM public.activation_verification_tokens
   WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Verification link is invalid or expired.');
  END IF;

  SELECT id, email, status, expires_at
    INTO v_request
    FROM public.activation_requests
   WHERE id = v_request_id
   FOR UPDATE NOWAIT;

  IF NOT FOUND OR v_request.status <> 'PENDING_EMAIL' OR v_request.expires_at <= now() THEN
    RETURN json_build_object('error', 'Verification link is invalid or expired.');
  END IF;

  SELECT id, request_id, expires_at, consumed_at, revoked_at
    INTO v_token
    FROM public.activation_verification_tokens
   WHERE id = v_token_id
     AND token_hash = p_token_hash
   FOR UPDATE NOWAIT;

  IF NOT FOUND OR v_token.request_id <> v_request.id
     OR v_token.consumed_at IS NOT NULL
     OR v_token.revoked_at IS NOT NULL
     OR v_token.expires_at <= now() THEN
    RETURN json_build_object('error', 'Verification link is invalid or expired.');
  END IF;

  UPDATE public.activation_verification_tokens
     SET consumed_at = now()
   WHERE id = v_token.id;

  UPDATE public.activation_verification_tokens
     SET revoked_at = now()
   WHERE request_id = v_request.id
     AND id <> v_token.id
     AND consumed_at IS NULL
     AND revoked_at IS NULL;

  UPDATE public.activation_requests
     SET status = 'AWAITING_SIGN_IN',
         verified_at = now()
   WHERE id = v_request.id;

  RETURN json_build_object('success', true, 'request_id', v_request.id);
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('error', 'Verification is being processed. Please retry.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_activation_verification_token(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_activation_verification_token(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_activation_verification_token(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_activation_verification_token(TEXT) TO service_role;
