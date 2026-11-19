-- Runs only against a disposable PostgreSQL service in GitHub Actions.
-- Validates the hardened definitions and the service_role-only execution boundary.
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

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user'
);
CREATE TABLE public.rate_limits (
  identifier text PRIMARY KEY,
  attempt_count integer NOT NULL,
  window_start timestamptz NOT NULL
);
CREATE TABLE public.hardware_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tap_count bigint NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_max_attempts integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
STRICT
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.rate_limits;
BEGIN
  IF length(p_identifier) = 0 OR length(p_identifier) > 255 THEN
    RAISE EXCEPTION 'invalid rate limit identifier';
  END IF;
  IF p_max_attempts < 1 OR p_max_attempts > 100000 THEN
    RAISE EXCEPTION 'invalid rate limit max attempts';
  END IF;
  IF p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit window';
  END IF;

  SELECT * INTO v_row FROM public.rate_limits
   WHERE identifier = p_identifier FOR UPDATE;

  IF v_row IS NULL THEN
    INSERT INTO public.rate_limits(identifier, attempt_count, window_start)
    VALUES (p_identifier, 1, now());
    RETURN true;
  END IF;

  IF extract(epoch FROM (now() - v_row.window_start)) > p_window_seconds THEN
    UPDATE public.rate_limits SET attempt_count = 1, window_start = now()
     WHERE identifier = p_identifier;
    RETURN true;
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limits SET attempt_count = attempt_count + 1
   WHERE identifier = p_identifier;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_account(target_email text)
RETURNS SETOF public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.accounts (email, role)
  VALUES (target_email, 'user')
  ON CONFLICT (email) DO NOTHING;

  RETURN QUERY
  SELECT * FROM public.accounts WHERE email = target_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_tap_count(card_id uuid)
RETURNS void
LANGUAGE sql
STRICT
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.hardware_cards SET tap_count = tap_count + 1 WHERE id = card_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.get_or_create_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_account(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_tap_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tap_count(uuid) TO service_role;

-- Apply the exact migration under test after the disposable baseline exists.
\i supabase/migrations/20261119100000_function_search_path_hardening.sql

DO $assertions$
DECLARE
  v_oid oid;
  v_config text[];
  v_name text;
  v_signatures text[] := ARRAY[
    'public.check_rate_limit(text,integer,integer)',
    'public.get_or_create_account(text)',
    'public.increment_tap_count(uuid)'
  ];
BEGIN
  FOREACH v_name IN ARRAY v_signatures LOOP
    v_oid := to_regprocedure(v_name);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Expected function missing: %', v_name;
    END IF;

    SELECT p.proconfig
      INTO v_config
      FROM pg_proc AS p
     WHERE p.oid = v_oid;

    IF NOT (coalesce(v_config, ARRAY[]::text[]) @> ARRAY['search_path=""']) THEN
      RAISE EXCEPTION 'Function % does not have an empty search_path: %', v_name, v_config;
    END IF;
    IF NOT (SELECT p.prosecdef FROM pg_proc AS p WHERE p.oid = v_oid) THEN
      RAISE EXCEPTION 'Function % is not SECURITY DEFINER', v_name;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE')
       OR has_function_privilege('authenticated', v_oid, 'EXECUTE')
       OR EXISTS (
         SELECT 1
           FROM pg_proc AS p,
                LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) AS acl
          WHERE p.oid = v_oid
            AND acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
       ) THEN
      RAISE EXCEPTION 'Function % is executable by an unintended role', v_name;
    END IF;
    IF NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role cannot execute %', v_name;
    END IF;
  END LOOP;

  IF position('public.rate_limits' IN pg_get_functiondef(to_regprocedure('public.check_rate_limit(text,integer,integer)'))) = 0
     OR position('public.accounts' IN pg_get_functiondef(to_regprocedure('public.get_or_create_account(text)'))) = 0
     OR position('public.hardware_cards' IN pg_get_functiondef(to_regprocedure('public.increment_tap_count(uuid)'))) = 0 THEN
    RAISE EXCEPTION 'A function is missing explicit schema-qualified table references';
  END IF;
END;
$assertions$;

-- Verify rate-limit behavior: allow two attempts, then reject the third.
DO $behavior$
BEGIN
  IF public.check_rate_limit('test-identifier', 2, 60) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'First rate-limit attempt should pass';
  END IF;
  IF public.check_rate_limit('test-identifier', 2, 60) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Second rate-limit attempt should pass';
  END IF;
  IF public.check_rate_limit('test-identifier', 2, 60) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Third rate-limit attempt should be rejected';
  END IF;
END;
$behavior$;

-- Verify account creation is idempotent and returns the existing account.
DO $behavior$
DECLARE
  v_count integer;
  v_id uuid;
BEGIN
  SELECT count(*), (array_agg(id))[1] INTO v_count, v_id
    FROM public.get_or_create_account('function-test@example.invalid');
  IF v_count <> 1 OR v_id IS NULL THEN
    RAISE EXCEPTION 'Account helper did not create and return exactly one account';
  END IF;

  IF (SELECT count(*) FROM public.get_or_create_account('function-test@example.invalid')) <> 1 THEN
    RAISE EXCEPTION 'Account helper did not return the existing account';
  END IF;
  IF (SELECT count(*) FROM public.accounts WHERE email = 'function-test@example.invalid') <> 1 THEN
    RAISE EXCEPTION 'Account helper created a duplicate account';
  END IF;
END;
$behavior$;

-- Verify tap count increments exactly once.
INSERT INTO public.hardware_cards(id, tap_count)
VALUES ('30000000-0000-0000-0000-000000000001', 4);

SELECT public.increment_tap_count('30000000-0000-0000-0000-000000000001');

DO $behavior$
BEGIN
  IF (SELECT tap_count FROM public.hardware_cards
       WHERE id = '30000000-0000-0000-0000-000000000001') <> 5 THEN
    RAISE EXCEPTION 'Tap counter did not increment exactly once';
  END IF;
END;
$behavior$;

SELECT 'function search_path hardening integration test passed' AS result;
