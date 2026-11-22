-- Finalization must only accept requests whose PULSE verification token was redeemed.
-- Branch-only migration; do not apply to production without review.
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

  IF v_request.status <> 'AWAITING_SIGN_IN' OR v_request.expires_at <= now() THEN
    UPDATE public.activation_requests
       SET status = 'EXPIRED'
     WHERE id = p_request_id
       AND status = 'AWAITING_SIGN_IN';
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
         verified_at = now(),
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

REVOKE EXECUTE ON FUNCTION public.create_activation_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_card_activation(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_activation_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_card_activation(UUID, UUID) TO service_role;
