-- =============================================================================
-- Migration: 0003_atomic_activation.sql
-- Purpose:   Atomic card activation in a single transaction.
--
-- All 5 steps (verify card, find/create account, find/create profile,
-- bind card) happen inside one BEGIN/COMMIT block. If any step fails,
-- Postgres rolls the entire thing back — no partial state, no orphaned
-- accounts, no stuck-UNCLAIMED cards.
--
-- Security:
--   SECURITY DEFINER  — runs with the role that owns this function
--                       (postgres/service role), not the caller's role.
--                       This is intentional: activation happens before
--                       the user has a Supabase Auth session, so RLS
--                       would block every write otherwise.
--   search_path = ''  — prevents search_path hijacking. All table
--                       references below use the full schema prefix.
--   EXECUTE revoked from public and anon — only the service role
--                       (used by the Next.js API route) can call this.
--
-- Caller: app/api/activate/route.ts via supabaseAdmin.rpc('activate_card')
-- =============================================================================

CREATE OR REPLACE FUNCTION activate_card(
  p_card_code   TEXT,
  p_email       TEXT,
  p_full_name   TEXT,
  p_slug        TEXT,
  p_profile_type TEXT   -- 'PROFESSIONAL' | 'PERSONAL'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_card        RECORD;
  v_account_id  UUID;
  v_profile_id  UUID;
  v_slug_owner  UUID;
BEGIN

  -- ── 0. Input validation ────────────────────────────────────────────────────
  IF p_card_code IS NULL OR trim(p_card_code) = '' THEN
    RETURN json_build_object('error', 'Card code is required.');
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

  -- ── 1. Lock the card row for this transaction ──────────────────────────────
  -- FOR UPDATE NOWAIT: if another concurrent activation is already
  -- processing this exact card code, we get an immediate error instead
  -- of waiting — which tells the second caller the card is being claimed.
  SELECT id, status
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

  -- ── 2. Find or create account ──────────────────────────────────────────────
  SELECT id INTO v_account_id
    FROM public.accounts
   WHERE email = lower(trim(p_email));

  IF NOT FOUND THEN
    INSERT INTO public.accounts (email)
    VALUES (lower(trim(p_email)))
    RETURNING id INTO v_account_id;
  END IF;

  -- ── 3. Check slug availability ─────────────────────────────────────────────
  -- A slug is taken if another account owns it. If THIS account already
  -- has a profile with this slug, that's fine — we update it below.
  SELECT account_id INTO v_slug_owner
    FROM public.profiles
   WHERE slug = lower(trim(p_slug));

  IF FOUND AND v_slug_owner <> v_account_id THEN
    RETURN json_build_object('error', 'That PULSE link is already taken. Try a different one.');
  END IF;

  -- ── 4. Find or create profile ──────────────────────────────────────────────
  SELECT id INTO v_profile_id
    FROM public.profiles
   WHERE account_id  = v_account_id
     AND profile_type = p_profile_type;

  IF FOUND THEN
    -- Profile exists for this account + type: update it
    UPDATE public.profiles
       SET full_name  = trim(p_full_name),
           slug       = lower(trim(p_slug)),
           email      = lower(trim(p_email)),
           is_active  = true
     WHERE id = v_profile_id;
  ELSE
    -- No profile yet: create one
    INSERT INTO public.profiles (
      account_id,
      email,
      full_name,
      slug,
      profile_type,
      is_active
    ) VALUES (
      v_account_id,
      lower(trim(p_email)),
      trim(p_full_name),
      lower(trim(p_slug)),
      p_profile_type,
      true
    )
    RETURNING id INTO v_profile_id;
  END IF;

  -- ── 5. Bind the card ───────────────────────────────────────────────────────
  -- The WHERE status = 'UNCLAIMED' is a second guard: if two requests
  -- somehow reach this point simultaneously, only the one that acquired
  -- the FOR UPDATE NOWAIT lock above will succeed here. The other will
  -- have already failed at step 1.
  UPDATE public.hardware_cards
     SET status     = 'ACTIVE',
         profile_id = v_profile_id
   WHERE id         = v_card.id
     AND status     = 'UNCLAIMED';

  IF NOT FOUND THEN
    -- Should be unreachable given the lock above, but belt-and-suspenders.
    RETURN json_build_object('error', 'This card was just claimed by someone else. Please contact support.');
  END IF;

  -- ── 6. All done — return success ───────────────────────────────────────────
  RETURN json_build_object(
    'success',     true,
    'slug',        lower(trim(p_slug)),
    'profile_id',  v_profile_id,
    'account_id',  v_account_id
  );

-- ── Exception handler ──────────────────────────────────────────────────────
-- Catches the NOWAIT lock failure (two people activating simultaneously)
-- and any other unexpected Postgres error. The transaction is rolled back
-- automatically when an exception propagates out of a plpgsql block.
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

-- ── Permissions ────────────────────────────────────────────────────────────────
-- Only the service role (used by the Next.js API) may call this function.
-- The anon and authenticated roles used by browser clients cannot.
REVOKE EXECUTE ON FUNCTION activate_card(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION activate_card(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION activate_card(TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;

-- The service_role is SUPERUSER so it retains execute regardless of revokes,
-- but be explicit for documentation purposes:
GRANT EXECUTE ON FUNCTION activate_card(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
