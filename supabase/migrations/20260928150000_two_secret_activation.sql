-- =============================================================================
-- Two-secret activation
--
-- card_code remains the public tap identifier encoded in the NFC URL.
-- activation_secret_hash is a separate credential used only to claim an
-- unclaimed card. The plaintext secret is never stored in the database.
--
-- Existing unclaimed cards have no activation secret after this migration and
-- must be issued a new secret from the admin panel before they can be claimed.
-- This intentionally fails closed rather than preserving the old card_code-only
-- activation path.
-- =============================================================================

ALTER TABLE public.hardware_cards
  ADD COLUMN IF NOT EXISTS activation_secret_hash TEXT,
  ADD COLUMN IF NOT EXISTS activation_secret_issued_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.activate_card(
  p_card_code TEXT,
  p_activation_secret_hash TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_slug TEXT,
  p_profile_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_card RECORD;
  v_account_id UUID;
  v_profile_id UUID;
  v_slug_owner UUID;
BEGIN
  IF p_card_code IS NULL OR trim(p_card_code) = '' THEN
    RETURN json_build_object('error', 'Card code is required.');
  END IF;
  IF p_activation_secret_hash IS NULL OR trim(p_activation_secret_hash) = '' THEN
    RETURN json_build_object('error', 'The activation secret is required.');
  END IF;
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN json_build_object('error', 'Email is required.');
  END IF;
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RETURN json_build_object('error', 'Full name is required.');
  END IF;
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN json_build_object('error', 'A PULSE link is required.');
  END IF;
  IF p_profile_type NOT IN ('PROFESSIONAL', 'PERSONAL') THEN
    RETURN json_build_object('error', 'Invalid profile type.');
  END IF;
  IF p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RETURN json_build_object('error', 'PULSE link can only contain lowercase letters, numbers, and hyphens.');
  END IF;

  SELECT id, status, activation_secret_hash
    INTO v_card
    FROM public.hardware_cards
   WHERE card_code = upper(trim(p_card_code))
     FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'We couldn''t find that card. Check the code on your card and try again.');
  END IF;

  IF v_card.status <> 'UNCLAIMED' THEN
    RETURN json_build_object('error', 'This card has already been activated or is no longer available.');
  END IF;

  IF v_card.activation_secret_hash IS NULL THEN
    RETURN json_build_object('error', 'This card needs a new activation credential. Please contact the card administrator.');
  END IF;

  IF lower(trim(p_activation_secret_hash)) <> lower(v_card.activation_secret_hash) THEN
    RETURN json_build_object('error', 'The activation secret is invalid.');
  END IF;

  SELECT id INTO v_account_id
    FROM public.accounts
   WHERE email = lower(trim(p_email));

  IF NOT FOUND THEN
    INSERT INTO public.accounts (email)
    VALUES (lower(trim(p_email)))
    RETURNING id INTO v_account_id;
  END IF;

  SELECT account_id INTO v_slug_owner
    FROM public.profiles
   WHERE slug = lower(trim(p_slug));

  IF FOUND AND v_slug_owner <> v_account_id THEN
    RETURN json_build_object('error', 'That PULSE link is already taken. Try a different one.');
  END IF;

  SELECT id INTO v_profile_id
    FROM public.profiles
   WHERE account_id = v_account_id
     AND profile_type = p_profile_type;

  IF FOUND THEN
    UPDATE public.profiles
       SET full_name = trim(p_full_name),
           slug = lower(trim(p_slug)),
           email = lower(trim(p_email)),
           is_active = true
     WHERE id = v_profile_id;
  ELSE
    INSERT INTO public.profiles (
      account_id, email, full_name, slug, profile_type, is_active
    ) VALUES (
      v_account_id, lower(trim(p_email)), trim(p_full_name),
      lower(trim(p_slug)), p_profile_type, true
    )
    RETURNING id INTO v_profile_id;
  END IF;

  UPDATE public.hardware_cards
     SET status = 'ACTIVE',
         profile_id = v_profile_id,
         activated_at = now(),
         activation_secret_hash = NULL,
         activation_secret_issued_at = NULL
   WHERE id = v_card.id
     AND status = 'UNCLAIMED'
     AND activation_secret_hash = v_card.activation_secret_hash;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'This card was just claimed by someone else. Please contact support.');
  END IF;

  RETURN json_build_object(
    'success', true,
    'slug', lower(trim(p_slug)),
    'profile_id', v_profile_id,
    'account_id', v_account_id
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('error', 'This card is being activated right now. Please try again in a moment.');
  WHEN unique_violation THEN
    RETURN json_build_object('error', 'That PULSE link is already taken. Try a different one.');
  WHEN OTHERS THEN
    RAISE LOG 'activate_card unexpected error: % %', SQLERRM, SQLSTATE;
    RETURN json_build_object('error', 'Something went wrong. Please try again.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
