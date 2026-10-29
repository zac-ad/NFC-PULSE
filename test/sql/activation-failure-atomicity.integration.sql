-- Runs only against the disposable PostgreSQL service in GitHub Actions.
-- PR #59 supplies the account/Auth lifecycle migration and the activation
-- preflight/atomicity migrations. This fixture exercises the preflight and
-- rollback migrations against isolated schema fixtures; it never connects to
-- or modifies production.
\set ON_ERROR_STOP on

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'CREATE ROLE anon NOLOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'CREATE ROLE authenticated NOLOGIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'CREATE ROLE service_role NOLOGIN';
  END IF;
END;
$roles$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text
);
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  auth_user_id uuid,
  deletion_status text NOT NULL
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  account_id uuid,
  slug text UNIQUE NOT NULL,
  profile_type text
);

INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'good@example.invalid'),
  ('00000000-0000-0000-0000-000000000002', 'taken@example.invalid'),
  ('00000000-0000-0000-0000-000000000003', 'deleting@example.invalid'),
  ('00000000-0000-0000-0000-000000000004', 'different@example.invalid'),
  ('00000000-0000-0000-0000-000000000005', 'moved@example.invalid');
INSERT INTO public.accounts(id, email, auth_user_id, deletion_status) VALUES
  ('10000000-0000-0000-0000-000000000001', 'good@example.invalid', '00000000-0000-0000-0000-000000000001', 'ACTIVE'),
  ('10000000-0000-0000-0000-000000000002', 'taken@example.invalid', '00000000-0000-0000-0000-000000000002', 'ACTIVE'),
  ('10000000-0000-0000-0000-000000000003', 'deleting@example.invalid', '00000000-0000-0000-0000-000000000003', 'DELETING'),
  ('10000000-0000-0000-0000-000000000004', 'mismatch@example.invalid', '00000000-0000-0000-0000-000000000004', 'ACTIVE'),
  ('10000000-0000-0000-0000-000000000005', 'old-email@example.invalid', '00000000-0000-0000-0000-000000000005', 'ACTIVE');
INSERT INTO public.profiles(id, account_id, slug, profile_type) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'taken-slug', 'PERSONAL'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'same-account-personal', 'PERSONAL');

CREATE TABLE public.hardware_cards (
  card_code text PRIMARY KEY,
  status text NOT NULL,
  activation_secret_hash text
);
INSERT INTO public.hardware_cards(card_code, status, activation_secret_hash) VALUES
  ('PREFLIGHT-GOOD', 'UNCLAIMED', 'hash-good'),
  ('PREFLIGHT-CLAIMED', 'ACTIVE', 'hash-claimed'),
  ('PREFLIGHT-NO-SECRET', 'UNCLAIMED', NULL);

CREATE TABLE public.activation_atomicity_probe (
  marker text NOT NULL
);

CREATE OR REPLACE FUNCTION public.activate_card_v2(
  p_card_code text,
  p_activation_secret_hash text,
  p_email text,
  p_full_name text,
  p_slug text,
  p_profile_type text,
  p_auth_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.activation_atomicity_probe(marker) VALUES ('write-before-late-failure');

  IF p_card_code = 'late-failure' THEN
    RETURN json_build_object('error', 'This card was just claimed by someone else. Please try again.');
  END IF;

  IF p_card_code = 'unexpected-error' THEN
    RAISE EXCEPTION 'fixture unexpected error';
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Something went wrong. Please try again.');
END;
$function$;

REVOKE ALL ON FUNCTION public.activate_card_v2(text,text,text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_card_v2(text,text,text,text,text,text,uuid) TO service_role;

-- Exercise the card preflight against a disposable hardware_cards fixture.
\i supabase/migrations/20261028130000_activation_preflight.sql

DO $preflight_assertions$
DECLARE
  v_result json;
BEGIN
  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', NULL, 'new-slug', 'PERSONAL');
  IF v_result->>'error' <> 'Email is required.' THEN
    RAISE EXCEPTION 'Missing email was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'new@example.invalid', 'new-slug', 'OTHER');
  IF v_result->>'error' <> 'Invalid profile type.' THEN
    RAISE EXCEPTION 'Invalid profile type was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'new@example.invalid', 'new-slug', 'PERSONAL');
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'Expected valid card preflight success, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'good@example.invalid', 'same-account-personal', 'PERSONAL');
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'Expected same-account same-profile slug reuse to pass, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'wrong-hash', 'new@example.invalid', 'new-slug', 'PERSONAL');
  IF v_result->>'error' <> 'The activation secret is invalid.' THEN
    RAISE EXCEPTION 'Wrong secret was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-MISSING', 'hash-good', 'new@example.invalid', 'new-slug', 'PERSONAL');
  IF v_result->>'error' NOT LIKE '%couldn''t find that card%' THEN
    RAISE EXCEPTION 'Missing card was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-CLAIMED', 'hash-claimed', 'new@example.invalid', 'new-slug', 'PERSONAL');
  IF v_result->>'error' <> 'This card has already been activated or is no longer available.' THEN
    RAISE EXCEPTION 'Claimed card was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-NO-SECRET', 'hash-good', 'new@example.invalid', 'new-slug', 'PERSONAL');
  IF v_result->>'error' NOT LIKE '%needs a new activation credential%' THEN
    RAISE EXCEPTION 'Card without secret was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'new@example.invalid', 'taken-slug', 'PERSONAL');
  IF v_result->>'error' NOT LIKE '%already taken%' THEN
    RAISE EXCEPTION 'Slug owned by another account was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'good@example.invalid', 'same-account-personal', 'PROFESSIONAL');
  IF v_result->>'error' NOT LIKE '%already taken%' THEN
    RAISE EXCEPTION 'Slug owned by another profile type was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'deleting@example.invalid', 'available-slug', 'PERSONAL');
  IF v_result->>'error' NOT LIKE '%still being removed%' THEN
    RAISE EXCEPTION 'Deleting account was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'mismatch@example.invalid', 'available-slug', 'PERSONAL');
  IF v_result->>'error' NOT LIKE '%already connected to another login identity%' THEN
    RAISE EXCEPTION 'Mismatched Auth identity was not rejected, got: %', v_result;
  END IF;

  v_result := public.validate_card_activation_v1('PREFLIGHT-GOOD', 'hash-good', 'moved@example.invalid', 'available-slug', 'PERSONAL');
  IF v_result->>'error' NOT LIKE '%already connected to another PULSE account%' THEN
    RAISE EXCEPTION 'Auth identity bound to an account with a different stored email was not rejected, got: %', v_result;
  END IF;

  IF has_function_privilege('anon', 'public.validate_card_activation_v1(text,text,text,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.validate_card_activation_v1(text,text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Preflight function must not be executable by anon/authenticated';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.validate_card_activation_v1(text,text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Preflight function must be executable by service_role';
  END IF;
END;
$preflight_assertions$;

-- Exercise the atomicity migration against the disposable fixture function.
\i supabase/migrations/20261028120000_activation_failure_atomicity.sql

DO $assertions$
DECLARE
  v_result json;
  v_function_oid oid := to_regprocedure('public.activate_card_v2(text,text,text,text,text,text,uuid)');
  v_is_security_definer boolean;
  v_config text[];
  v_probe_count bigint;
BEGIN
  v_result := public.activate_card_v2(
    'late-failure',
    'unused-test-hash',
    'test@example.invalid',
    'Test User',
    'test-user',
    'personal',
    '00000000-0000-0000-0000-000000000001'::uuid
  );

  IF v_result->>'error' <> 'This card was just claimed by someone else. Please try again.' THEN
    RAISE EXCEPTION 'Expected the late card-claim error, got: %', v_result;
  END IF;

  IF EXISTS (SELECT 1 FROM public.activation_atomicity_probe) THEN
    RAISE EXCEPTION 'Late activation failure did not roll back the earlier database write';
  END IF;

  -- Confirm a normal call still succeeds and commits its write.
  v_result := public.activate_card_v2(
    'normal-success',
    'unused-test-hash',
    'test@example.invalid',
    'Test User',
    'test-user',
    'personal',
    '00000000-0000-0000-0000-000000000001'::uuid
  );
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'Expected normal activation success, got: %', v_result;
  END IF;

  SELECT count(*) INTO v_probe_count FROM public.activation_atomicity_probe;
  IF v_probe_count <> 1 THEN
    RAISE EXCEPTION 'Expected normal activation to commit exactly one write, found %', v_probe_count;
  END IF;

  -- Confirm the generic error handler still returns its stable response and
  -- rolls back only the failing call's write.
  v_result := public.activate_card_v2(
    'unexpected-error',
    'unused-test-hash',
    'test@example.invalid',
    'Test User',
    'test-user',
    'personal',
    '00000000-0000-0000-0000-000000000001'::uuid
  );
  IF v_result->>'error' <> 'Something went wrong. Please try again.' THEN
    RAISE EXCEPTION 'Expected the generic error response, got: %', v_result;
  END IF;
  SELECT count(*) INTO v_probe_count FROM public.activation_atomicity_probe;
  IF v_probe_count <> 1 THEN
    RAISE EXCEPTION 'Unexpected error did not roll back only its own write; found % rows', v_probe_count;
  END IF;

  SELECT p.prosecdef, p.proconfig
    INTO v_is_security_definer, v_config
    FROM pg_proc AS p
   WHERE p.oid = v_function_oid;

  IF v_is_security_definer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Migration changed SECURITY DEFINER behavior';
  END IF;
  IF NOT (coalesce(v_config, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'Migration did not preserve the empty search_path setting: %', v_config;
  END IF;
  IF has_function_privilege('anon', v_function_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Migration widened execute permissions for anon/authenticated';
  END IF;
  IF NOT has_function_privilege('service_role', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Migration did not preserve service_role execute permission';
  END IF;
END;
$assertions$;

SELECT 'activation failure atomicity integration test passed' AS result;
