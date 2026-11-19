-- Standardize SECURITY DEFINER function search paths.
--
-- These functions are service_role-only. Keep their behavior and signatures
-- unchanged while removing reliance on an implicit schema lookup path.
-- Every relation reference below is explicitly schema-qualified.

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

  SELECT *
    INTO v_row
    FROM public.rate_limits
   WHERE identifier = p_identifier
   FOR UPDATE;

  IF v_row IS NULL THEN
    INSERT INTO public.rate_limits(identifier, attempt_count, window_start)
    VALUES (p_identifier, 1, now());
    RETURN true;
  END IF;

  IF extract(epoch FROM (now() - v_row.window_start)) > p_window_seconds THEN
    UPDATE public.rate_limits
       SET attempt_count = 1,
           window_start = now()
     WHERE identifier = p_identifier;
    RETURN true;
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  UPDATE public.rate_limits
     SET attempt_count = attempt_count + 1
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
  SELECT *
    FROM public.accounts
   WHERE email = target_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_tap_count(card_id uuid)
RETURNS void
LANGUAGE sql
STRICT
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.hardware_cards
     SET tap_count = tap_count + 1
   WHERE id = card_id;
$function$;

-- Make the intended execution boundary explicit. CREATE OR REPLACE preserves
-- existing ACLs, and these statements reaffirm the verified service-only rule.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_or_create_account(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_or_create_account(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_account(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_account(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_tap_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_tap_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_tap_count(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tap_count(uuid) TO service_role;
