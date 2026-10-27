-- Validate the card credential before the activation route creates or confirms a
-- Supabase Auth identity. The final activation RPC must still revalidate because
-- this read and the later activation are separate transactions.
CREATE OR REPLACE FUNCTION public.validate_card_activation_v1(
  p_card_code text,
  p_activation_secret_hash text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_card record;
BEGIN
  IF p_card_code IS NULL OR trim(p_card_code) = '' THEN
    RETURN json_build_object('error', 'Card code is required.');
  END IF;
  IF p_activation_secret_hash IS NULL OR trim(p_activation_secret_hash) = '' THEN
    RETURN json_build_object('error', 'The activation secret is required.');
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

  RETURN json_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_card_activation_v1(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_card_activation_v1(text, text) TO service_role;
