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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  slug text UNIQUE NOT NULL,
  profile_type text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'good@example.invalid'),
  ('00000000-0000-0000-0000-000000000002', 'taken@example.invalid'),
  ('00000000-0000-0000-0000-000000000003', 'deleting@example.invalid'),
  ('00000000-0000-0000-0000-000000000004', 'mismatch@example.invalid'),
  ('00000000-0000-0000-0000-000000000005', 'old-email@example.invalid'),
  ('00000000-0000-0000-0000-000000000009', 'late@example.invalid'),
  ('00000000-0000-0000-0000-000000000010', 'success@example.invalid'),
  ('00000000-0000-0000-0000-000000000011', 'error@example.invalid');
INSERT INTO public.accounts(id, email) VALUES
  ('10000000-0000-0000-0000-000000000001', 'good@example.invalid'),
  ('10000000-0000-0000-0000-000000000002', 'taken@example.invalid'),
  ('10000000-0000-0000-0000-000000000003', 'deleting@example.invalid'),
  ('10000000-0000-0000-0000-000000000004', 'mismatch@example.invalid'),
  ('10000000-0000-0000-0000-000000000005', 'old-email@example.invalid');

-- Exercise the real account/Auth lifecycle migration from the pre-lifecycle schema.
\i supabase/migrations/20261002071402_account_auth_lifecycle.sql

DO $lifecycle_assertions$
DECLARE
  v_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.accounts
     WHERE auth_user_id IS NULL OR deletion_status <> 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Lifecycle migration did not backfill every account or set ACTIVE status';
  END IF;

  SELECT count(*) INTO v_count FROM public.accounts;
  IF v_count <> 5 THEN
    RAISE EXCEPTION 'Expected five migrated accounts, found %', v_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'accounts_auth_user_id_fkey'
       AND contype = 'f'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'accounts_deletion_status_check'
       AND contype = 'c'
  ) OR to_regclass('public.accounts_auth_user_id_key') IS NULL THEN
    RAISE EXCEPTION 'Lifecycle migration did not create its expected constraints and unique index';
  END IF;
END;
$lifecycle_assertions$;

-- Simulate Auth email changes after the account identities have been bound.
UPDATE auth.users
   SET email = 'different@example.invalid'
 WHERE id = '00000000-0000-0000-0000-000000000004';
UPDATE auth.users
   SET email = 'moved@example.invalid'
 WHERE id = '00000000-0000-0000-0000-000000000005';
INSERT INTO public.profiles(id, account_id, slug, profile_type, full_name, email) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'taken-slug', 'PERSONAL', 'Taken User', 'taken@example.invalid'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'same-account-personal', 'PERSONAL', 'Good User', 'good@example.invalid');

UPDATE public.accounts SET deletion_status = 'DELETING'
 WHERE email = 'deleting@example.invalid';

CREATE TABLE public.hardware_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_code text UNIQUE NOT NULL,
  status text NOT NULL,
  activation_secret_hash text,
  profile_id uuid REFERENCES public.profiles(id),
  activated_at timestamptz,
  activation_secret_issued_at timestamptz
);
INSERT INTO public.hardware_cards(card_code, status, activation_secret_hash) VALUES
  ('PREFLIGHT-GOOD', 'UNCLAIMED', 'hash-good'),
  ('PREFLIGHT-CLAIMED', 'ACTIVE', 'hash-claimed'),
  ('PREFLIGHT-NO-SECRET', 'UNCLAIMED', NULL),
  ('ATOMIC-LATE-FAILURE', 'UNCLAIMED', 'hash-late'),
  ('ATOMIC-SUCCESS', 'UNCLAIMED', 'hash-success'),
  ('ATOMIC-UNEXPECTED-ERROR', 'UNCLAIMED', 'hash-error');

-- The lifecycle migration above creates the real production activation function.
-- Keep its function body intact; only the production forward migrations patch it.

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
\i supabase/migrations/20261028140000_activation_identity_binding.sql
\i supabase/migrations/20261119110000_activation_final_slug_profile_type.sql

-- Test-only trigger simulates a late conditional card update that affects zero rows.
-- The real activation function has already created/updated the account and profile
-- when this happens; the migration must force rollback of those earlier writes.
CREATE OR REPLACE FUNCTION public.test_skip_late_card_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $trigger$
BEGIN
  IF OLD.card_code = 'ATOMIC-LATE-FAILURE' AND NEW.status = 'ACTIVE' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$trigger$;
CREATE TRIGGER test_skip_late_card_claim
BEFORE UPDATE ON public.hardware_cards
FOR EACH ROW EXECUTE FUNCTION public.test_skip_late_card_claim();

-- A separate injected profile insert error verifies the generic exception path
-- also rolls back the account inserted earlier in the same activation call.
CREATE OR REPLACE FUNCTION public.test_raise_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $trigger$
BEGIN
  IF NEW.slug = 'atomic-unexpected-error' THEN
    RAISE EXCEPTION 'fixture unexpected profile insert failure';
  END IF;
  RETURN NEW;
END;
$trigger$;
CREATE TRIGGER test_raise_profile_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.test_raise_profile_insert();

DO $assertions$
DECLARE
  v_result json;
  v_profile_id uuid;
  v_account_id uuid;
  v_card_status text;
  v_card_secret text;
  v_is_security_definer boolean;
  v_config text[];
  v_function_oid oid := to_regprocedure('public.activate_card_v2(text,text,text,text,text,text,uuid)');
BEGIN
  -- Final activation must reject an Auth identity already bound to another
  -- account, even when that Auth identity's current email matches the request.
  v_result := public.activate_card_v2(
    'ATOMIC-SUCCESS', 'hash-success', 'different@example.invalid',
    'Mismatch User', 'identity-mismatch', 'PERSONAL',
    '00000000-0000-0000-0000-000000000004'::uuid
  );
  IF v_result->>'error' <> 'This login identity is already connected to another PULSE account.' THEN
    RAISE EXCEPTION 'Final activation did not reject cross-account Auth identity, got: %', v_result;
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE email = 'different@example.invalid')
     OR EXISTS (SELECT 1 FROM public.profiles WHERE slug = 'identity-mismatch') THEN
    RAISE EXCEPTION 'Identity-binding rejection left account/profile writes behind';
  END IF;

  -- The final transaction must reject a slug owned by this account's other profile type.
  v_result := public.activate_card_v2(
    'ATOMIC-SUCCESS', 'hash-success', 'good@example.invalid',
    'Good User', 'same-account-personal', 'PROFESSIONAL',
    '00000000-0000-0000-0000-000000000001'::uuid
  );
  IF v_result->>'error' <> 'That PULSE link is already taken. Try a different one.' THEN
    RAISE EXCEPTION 'Final activation did not reject same-account cross-profile-type slug reuse, got: %', v_result;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
     WHERE account_id = '10000000-0000-0000-0000-000000000001'
       AND profile_type = 'PROFESSIONAL'
       AND slug = 'same-account-personal'
  ) THEN
    RAISE EXCEPTION 'Cross-profile-type slug rejection created or changed a profile';
  END IF;

  -- The actual production activation function now reaches its late card update.
  -- The test trigger makes that conditional UPDATE affect zero rows.
  v_result := public.activate_card_v2(
    'ATOMIC-LATE-FAILURE', 'hash-late', 'late@example.invalid',
    'Late Failure User', 'atomic-late-failure', 'PERSONAL',
    '00000000-0000-0000-0000-000000000009'::uuid
  );
  IF v_result->>'error' <> 'This card was just claimed by someone else. Please try again.' THEN
    RAISE EXCEPTION 'Expected late card-claim failure, got: %', v_result;
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE email = 'late@example.invalid')
     OR EXISTS (SELECT 1 FROM public.profiles WHERE slug = 'atomic-late-failure') THEN
    RAISE EXCEPTION 'Late activation failure did not roll back account/profile writes';
  END IF;
  SELECT status, activation_secret_hash INTO v_card_status, v_card_secret
    FROM public.hardware_cards WHERE card_code = 'ATOMIC-LATE-FAILURE';
  IF v_card_status <> 'UNCLAIMED' OR v_card_secret <> 'hash-late' THEN
    RAISE EXCEPTION 'Late failure changed the card state or activation credential';
  END IF;

  -- A successful activation must persist account, profile, and card binding.
  v_result := public.activate_card_v2(
    'ATOMIC-SUCCESS', 'hash-success', 'success@example.invalid',
    'Success User', 'atomic-success', 'PERSONAL',
    '00000000-0000-0000-0000-000000000010'::uuid
  );
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'Expected real activation success, got: %', v_result;
  END IF;
  v_account_id := (v_result->>'account_id')::uuid;
  v_profile_id := (v_result->>'profile_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = v_account_id AND auth_user_id = '00000000-0000-0000-0000-000000000010'::uuid)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_profile_id AND account_id = v_account_id AND slug = 'atomic-success')
     OR NOT EXISTS (SELECT 1 FROM public.hardware_cards WHERE card_code = 'ATOMIC-SUCCESS' AND status = 'ACTIVE' AND profile_id = v_profile_id AND activation_secret_hash IS NULL) THEN
    RAISE EXCEPTION 'Successful activation did not persist all expected account/profile/card changes';
  END IF;

  -- Generic exception after account creation must roll back the account insert.
  v_result := public.activate_card_v2(
    'ATOMIC-UNEXPECTED-ERROR', 'hash-error', 'error@example.invalid',
    'Error User', 'atomic-unexpected-error', 'PERSONAL',
    '00000000-0000-0000-0000-000000000011'::uuid
  );
  IF v_result->>'error' <> 'Something went wrong. Please try again.' THEN
    RAISE EXCEPTION 'Expected generic activation error, got: %', v_result;
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE email = 'error@example.invalid')
     OR EXISTS (SELECT 1 FROM public.profiles WHERE slug = 'atomic-unexpected-error') THEN
    RAISE EXCEPTION 'Generic activation exception did not roll back account/profile writes';
  END IF;

  SELECT p.prosecdef, p.proconfig INTO v_is_security_definer, v_config
    FROM pg_proc AS p WHERE p.oid = v_function_oid;
  IF v_is_security_definer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Activation function is not SECURITY DEFINER';
  END IF;
  IF NOT (coalesce(v_config, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'Activation function lost its empty search_path: %', v_config;
  END IF;
  IF has_function_privilege('anon', v_function_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Activation execute permissions were widened';
  END IF;
  IF NOT has_function_privilege('service_role', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute activation function';
  END IF;
END;
$assertions$;

SELECT 'production activation function integration test passed' AS result;

SELECT 'activation failure atomicity integration test passed' AS result;
