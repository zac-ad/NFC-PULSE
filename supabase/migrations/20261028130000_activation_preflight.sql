-- Validate the card credential and predictable account/profile conflicts before the
-- activation route creates or confirms any Supabase Auth identity.
-- The final activation RPC must repeat these checks transactionally to handle races.
CREATE OR REPLACE FUNCTION public.validate_card_activation_v1(
  p_card_code text,
  p_activation_secret_hash text,
  p_email text,
  p_slug text,
  p_profile_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_card record;
  v_account record;
  v_account_exists boolean;
  v_slug_profile record;
  v_auth_email text;
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
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN json_build_object('error', 'A PULSE link is required.');
  END IF;
  IF p_profile_type NOT IN ('PROFESSIONAL', 'PERSONAL') THEN
    RETURN json_build_object('error', 'Invalid profile type.');
  END IF;

  SELECT status, activation_secret_hash
    INTO v_card
    FROM public.hardware_cards
   WHERE card_code = upper(trim(p_card_code));

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

  -- Reject account lifecycle and identity mismatches before Auth mutation.
  SELECT id, auth_user_id, deletion_status
    INTO v_account
    FROM public.accounts
   WHERE email = lower(trim(p_email));
  v_account_exists := FOUND;

  IF v_account_exists THEN
    IF v_account.deletion_status <> 'ACTIVE' THEN
      RETURN json_build_object('error', 'This account is still being removed. Please try again after cleanup is complete.');
    END IF;

    IF v_account.auth_user_id IS NOT NULL THEN
      SELECT email
        INTO v_auth_email
        FROM auth.users
       WHERE id = v_account.auth_user_id;

      IF NOT FOUND OR lower(trim(v_auth_email)) IS DISTINCT FROM lower(trim(p_email)) THEN
        RETURN json_build_object('error', 'This email is already connected to another login identity.');
      END IF;
    END IF;
  END IF;

  -- A slug may only be reused for the same account's same profile type, which
  -- is the exact profile that activate_card_v2 would update rather than insert.
  SELECT account_id, profile_type
    INTO v_slug_profile
    FROM public.profiles
   WHERE slug = lower(trim(p_slug));

  IF FOUND AND (
    NOT v_account_exists
    OR v_slug_profile.account_id IS DISTINCT FROM v_account.id
    OR v_slug_profile.profile_type IS DISTINCT FROM upper(trim(p_profile_type))
  ) THEN
    RETURN json_build_object('error', 'That PULSE link is already taken. Try a different one.');
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_card_activation_v1(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_card_activation_v1(text, text, text, text, text) TO service_role;
