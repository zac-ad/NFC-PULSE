-- Account/Auth identity binding and resumable account deletion lifecycle.
--
-- public.accounts is now directly linked to auth.users so application code never
-- has to guess which Auth identity belongs to an account.
-- deletion_status makes destructive cleanup resumable across the Auth API and
-- Postgres boundary; those two systems cannot share one transaction.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS deletion_status TEXT NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.accounts a
      JOIN auth.users u
        ON lower(u.email) = lower(a.email)
     WHERE a.auth_user_id IS NULL
     GROUP BY a.id
     HAVING count(u.id) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot backfill accounts: multiple Auth users match an account email.';
  END IF;
END;
$$;

UPDATE public.accounts a
   SET auth_user_id = u.id
  FROM auth.users u
 WHERE a.auth_user_id IS NULL
   AND lower(u.email) = lower(a.email);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.accounts
     WHERE auth_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot complete lifecycle migration: every existing PULSE account must map to an Auth user.';
  END IF;
END;
$$;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_auth_user_id_fkey
  FOREIGN KEY (auth_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_deletion_status_check
  CHECK (deletion_status IN ('ACTIVE', 'DELETING'));

CREATE UNIQUE INDEX IF NOT EXISTS accounts_auth_user_id_key
  ON public.accounts(auth_user_id);

DROP FUNCTION IF EXISTS public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.activate_card(
  p_card_code TEXT,
  p_activation_secret_hash TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_slug TEXT,
  p_profile_type TEXT,
  p_auth_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_card RECORD;
  v_account RECORD;
  v_profile_id UUID;
  v_slug_owner UUID;
  v_auth_email TEXT;
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
  IF p_auth_user_id IS NULL THEN
    RETURN json_build_object('error', 'A valid login identity is required.');
  END IF;
  IF p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RETURN json_build_object('error', 'PULSE link can only contain lowercase letters, numbers, and hyphens.');
  END IF;

  SELECT email
    INTO v_auth_email
    FROM auth.users
   WHERE id = p_auth_user_id;

  IF NOT FOUND OR lower(trim(v_auth_email)) <> lower(trim(p_email)) THEN
    RETURN json_build_object('error', 'The login identity does not match this email address.');
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

  SELECT id, auth_user_id, deletion_status
    INTO v_account
    FROM public.accounts
   WHERE email = lower(trim(p_email))
     FOR UPDATE;

  -- Check the requested slug before changing or creating the account. This
  -- keeps every early validation failure side-effect free.
  SELECT account_id INTO v_slug_owner
    FROM public.profiles
   WHERE slug = lower(trim(p_slug));

  IF FOUND AND (v_account.id IS NULL OR v_slug_owner <> v_account.id) THEN
    RETURN json_build_object('error', 'That PULSE link is already taken. Try a different one.');
  END IF;

  IF FOUND THEN
    IF v_account.deletion_status <> 'ACTIVE' THEN
      RETURN json_build_object('error', 'This account is still being removed. Please try again after cleanup is complete.');
    END IF;

    IF v_account.auth_user_id IS NULL THEN
      UPDATE public.accounts
         SET auth_user_id = p_auth_user_id
       WHERE id = v_account.id;
    ELSIF v_account.auth_user_id <> p_auth_user_id THEN
      RETURN json_build_object('error', 'This email is already connected to another login identity.');
    END IF;
  ELSE
    INSERT INTO public.accounts (email, auth_user_id, deletion_status)
    VALUES (lower(trim(p_email)), p_auth_user_id, 'ACTIVE')
    RETURNING id, auth_user_id, deletion_status
      INTO v_account;
  END IF;

  SELECT id INTO v_profile_id
    FROM public.profiles
   WHERE account_id = v_account.id
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
      v_account.id, lower(trim(p_email)), trim(p_full_name),
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
    RETURN json_build_object('error', 'This card was just claimed by someone else. Please try again.');
  END IF;

  RETURN json_build_object(
    'success', true,
    'slug', lower(trim(p_slug)),
    'profile_id', v_profile_id,
    'account_id', v_account.id
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('error', 'This card is being activated right now. Please try again in a moment.');
  WHEN unique_violation THEN
    RETURN json_build_object('error', 'That PULSE link or account is already in use. Try again.');
  WHEN OTHERS THEN
    RAISE LOG 'activate_card unexpected error: % %', SQLERRM, SQLSTATE;
    RETURN json_build_object('error', 'Something went wrong. Please try again.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_card(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
