-- Activation verification tokens: high-entropy, single-use tokens for proving email ownership.
-- Raw tokens are never stored; only fixed-length SHA-256 hashes are persisted.

-- Update activation_requests status check to support EMAIL_VERIFIED state
ALTER TABLE public.activation_requests
  DROP CONSTRAINT IF EXISTS activation_requests_status_check;

ALTER TABLE public.activation_requests
  ADD CONSTRAINT activation_requests_status_check
  CHECK (status IN ('PENDING_EMAIL', 'EMAIL_VERIFIED', 'COMPLETED', 'EXPIRED', 'CANCELLED'));

CREATE TABLE IF NOT EXISTS public.activation_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.activation_requests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  purpose TEXT NOT NULL DEFAULT 'activation_verification'
    CHECK (purpose = 'activation_verification'),
  CONSTRAINT activation_verification_tokens_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS activation_verification_tokens_request_idx
  ON public.activation_verification_tokens (request_id);

CREATE INDEX IF NOT EXISTS activation_verification_tokens_active_idx
  ON public.activation_verification_tokens (token_hash)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.activation_verification_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.activation_verification_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activation_verification_tokens TO service_role;

-- Issue a fresh verification token hash for a pending activation request.
-- Revokes any previously active, unconsumed tokens for this request.
CREATE OR REPLACE FUNCTION public.issue_activation_verification_token(
  p_request_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
  v_token_id UUID;
BEGIN
  IF p_request_id IS NULL
     OR coalesce(trim(p_token_hash), '') = ''
     OR p_token_hash !~ '^[a-fA-F0-9]{64}$'
     OR p_expires_at IS NULL
     OR p_expires_at <= now() THEN
    RETURN json_build_object('error', 'Invalid token parameters.');
  END IF;

  SELECT id, card_id, email, status, expires_at
    INTO v_request
    FROM public.activation_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Activation request not found.');
  END IF;

  IF v_request.status <> 'PENDING_EMAIL' OR v_request.expires_at <= now() THEN
    RETURN json_build_object('error', 'Activation request is not active or has expired.');
  END IF;

  -- Revoke any existing active token for this request
  UPDATE public.activation_verification_tokens
     SET revoked_at = now()
   WHERE request_id = p_request_id
     AND consumed_at IS NULL
     AND revoked_at IS NULL;

  -- Insert the new token hash
  INSERT INTO public.activation_verification_tokens
    (request_id, token_hash, expires_at)
  VALUES
    (p_request_id, lower(trim(p_token_hash)), p_expires_at)
  RETURNING id INTO v_token_id;

  RETURN json_build_object(
    'success', true,
    'token_id', v_token_id,
    'request_id', p_request_id,
    'email', v_request.email,
    'expires_at', p_expires_at
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('error', 'Activation request is currently being processed.');
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Atomically consume a verification token and transition request to EMAIL_VERIFIED.
-- Replay-safe: exactly one transaction may consume a token.
CREATE OR REPLACE FUNCTION public.consume_activation_verification_token(
  p_token_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token RECORD;
  v_request RECORD;
  v_card RECORD;
BEGIN
  IF coalesce(trim(p_token_hash), '') = ''
     OR p_token_hash !~ '^[a-fA-F0-9]{64}$' THEN
    RETURN json_build_object('error', 'Invalid or malformed verification token.');
  END IF;

  -- Lock the token row
  SELECT id, request_id, token_hash, expires_at, consumed_at, revoked_at
    INTO v_token
    FROM public.activation_verification_tokens
   WHERE token_hash = lower(trim(p_token_hash))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Verification token not found or already expired.');
  END IF;

  IF v_token.consumed_at IS NOT NULL THEN
    RETURN json_build_object('error', 'Verification token has already been used.');
  END IF;

  IF v_token.revoked_at IS NOT NULL THEN
    RETURN json_build_object('error', 'Verification token has been superseded or revoked.');
  END IF;

  IF v_token.expires_at <= now() THEN
    RETURN json_build_object('error', 'Verification token has expired. Please request a new link.');
  END IF;

  -- Lock the associated request
  SELECT id, card_id, email, full_name, slug, profile_type, status, expires_at
    INTO v_request
    FROM public.activation_requests
   WHERE id = v_token.request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Associated activation request not found.');
  END IF;

  IF v_request.status = 'COMPLETED' THEN
    RETURN json_build_object('error', 'Activation has already been completed.');
  END IF;

  IF v_request.status <> 'PENDING_EMAIL' OR v_request.expires_at <= now() THEN
    RETURN json_build_object('error', 'Activation request has expired. Please restart activation.');
  END IF;

  -- Check hardware card is still unclaimed
  SELECT id, status
    INTO v_card
    FROM public.hardware_cards
   WHERE id = v_request.card_id
   FOR UPDATE;

  IF NOT FOUND OR v_card.status <> 'UNCLAIMED' THEN
    RETURN json_build_object('error', 'The hardware card is no longer available for activation.');
  END IF;

  -- Mark token consumed
  UPDATE public.activation_verification_tokens
     SET consumed_at = now()
   WHERE id = v_token.id;

  -- Mark request EMAIL_VERIFIED
  UPDATE public.activation_requests
     SET status = 'EMAIL_VERIFIED',
         verified_at = now()
   WHERE id = v_request.id;

  RETURN json_build_object(
    'success', true,
    'request_id', v_request.id,
    'email', v_request.email,
    'slug', v_request.slug,
    'profile_type', v_request.profile_type,
    'full_name', v_request.full_name
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('error', 'Verification is currently being processed. Please try again shortly.');
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_activation_verification_token(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_activation_verification_token(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_activation_verification_token(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_activation_verification_token(TEXT) TO service_role;

-- Update finalize_card_activation to support both PENDING_EMAIL and EMAIL_VERIFIED states
CREATE OR REPLACE FUNCTION public.finalize_card_activation(
  p_request_id UUID,
  p_auth_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
  v_auth_email TEXT;
  v_verified_at TIMESTAMPTZ;
  v_account_id UUID;
  v_account RECORD;
  v_profile_id UUID;
  v_slug_owner UUID;
  v_card RECORD;
BEGIN
  SELECT id, card_id, email, full_name, slug, profile_type, activation_secret_hash,
         status, expires_at, auth_user_id, completed_at
    INTO v_request
    FROM public.activation_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Activation request not found or expired.');
  END IF;

  IF v_request.status = 'COMPLETED' THEN
    IF v_request.auth_user_id = p_auth_user_id THEN
      RETURN json_build_object('success', true, 'already_completed', true);
    END IF;
    RETURN json_build_object('error', 'Activation request is not valid.');
  END IF;

  IF v_request.status NOT IN ('PENDING_EMAIL', 'EMAIL_VERIFIED') OR v_request.expires_at <= now() THEN
    UPDATE public.activation_requests
       SET status = 'EXPIRED'
     WHERE id = p_request_id
       AND status IN ('PENDING_EMAIL', 'EMAIL_VERIFIED');
    RETURN json_build_object('error', 'Activation request expired. Please start again.');
  END IF;

  SELECT email, email_confirmed_at
    INTO v_auth_email, v_verified_at
    FROM auth.users
   WHERE id = p_auth_user_id;

  IF NOT FOUND
     OR v_verified_at IS NULL
     OR lower(v_auth_email) <> v_request.email THEN
    RETURN json_build_object('error', 'Please verify the email used for this activation.');
  END IF;

  SELECT id, status, activation_secret_hash
    INTO v_card
    FROM public.hardware_cards
   WHERE id = v_request.card_id
   FOR UPDATE;

  IF NOT FOUND
     OR v_card.status <> 'UNCLAIMED'
     OR v_card.activation_secret_hash IS NULL
     OR v_card.activation_secret_hash <> v_request.activation_secret_hash THEN
    RETURN json_build_object('error', 'This card is no longer available to activate.');
  END IF;

  SELECT id, auth_user_id, deletion_status
    INTO v_account
    FROM public.accounts
   WHERE email = v_request.email
   FOR UPDATE;

  IF FOUND THEN
    IF v_account.deletion_status <> 'ACTIVE' THEN
      RETURN json_build_object('error', 'This account is not available for activation.');
    END IF;
    IF v_account.auth_user_id IS NOT NULL
       AND v_account.auth_user_id <> p_auth_user_id THEN
      RETURN json_build_object('error', 'This email is already connected to another login.');
    END IF;
    v_account_id := v_account.id;
  ELSE
    v_account_id := NULL;
  END IF;

  -- Identify the profile that this account/profile-type pair would update.
  IF v_account_id IS NOT NULL THEN
    SELECT id
      INTO v_profile_id
      FROM public.profiles
     WHERE account_id = v_account_id
       AND profile_type = v_request.profile_type;
  ELSE
    v_profile_id := NULL;
  END IF;

  -- A slug may only be retained by the profile being updated.
  SELECT id
    INTO v_slug_owner
    FROM public.profiles
   WHERE slug = v_request.slug;

  IF FOUND AND (v_profile_id IS NULL OR v_slug_owner <> v_profile_id) THEN
    RETURN json_build_object('error', 'That profile link is already taken.');
  END IF;

  -- Writes begin only after all validations above have passed.
  IF v_account_id IS NULL THEN
    INSERT INTO public.accounts (email, auth_user_id)
    VALUES (v_request.email, p_auth_user_id)
    RETURNING id INTO v_account_id;
  ELSE
    UPDATE public.accounts
       SET auth_user_id = p_auth_user_id
     WHERE id = v_account_id;
  END IF;

  IF v_profile_id IS NOT NULL THEN
    UPDATE public.profiles
       SET full_name = v_request.full_name,
           email = v_request.email,
           slug = v_request.slug,
           is_active = true
     WHERE id = v_profile_id;
  ELSE
    INSERT INTO public.profiles
      (account_id, email, full_name, slug, profile_type, is_active)
    VALUES
      (v_account_id, v_request.email, v_request.full_name, v_request.slug,
       v_request.profile_type, true)
    RETURNING id INTO v_profile_id;
  END IF;

  UPDATE public.hardware_cards
     SET status = 'ACTIVE',
         profile_id = v_profile_id,
         account_id = v_account_id,
         activated_at = now(),
         activation_secret_hash = NULL,
         activation_secret_issued_at = NULL
   WHERE id = v_request.card_id
     AND status = 'UNCLAIMED'
     AND activation_secret_hash = v_request.activation_secret_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card activation final update failed; rollback required';
  END IF;

  UPDATE public.activation_requests
     SET status = 'COMPLETED',
         auth_user_id = p_auth_user_id,
         verified_at = coalesce(v_request.verified_at, now()),
         completed_at = now()
   WHERE id = p_request_id;

  RETURN json_build_object(
    'success', true,
    'slug', v_request.slug,
    'profile_id', v_profile_id,
    'account_id', v_account_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE;
  WHEN lock_not_available THEN
    RETURN json_build_object('error', 'Activation is already being processed. Try again shortly.');
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_card_activation(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_card_activation(UUID, UUID) TO service_role;

