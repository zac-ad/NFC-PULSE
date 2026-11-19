-- Keep the final activation transaction's slug rule aligned with preflight.
-- A slug owned by this account's other profile type is still unavailable.
-- Patch only the exact known condition and refuse an unknown/ambiguous function body.

DO $migration$
DECLARE
  v_function_oid oid;
  v_definition text;
  v_old_condition text := 'IF FOUND AND (v_account_exists = FALSE OR v_slug_owner <> v_account.id) THEN';
  v_new_condition text := $replacement$IF FOUND AND (
    v_account_exists = FALSE
    OR v_slug_owner <> v_account.id
    OR NOT EXISTS (
      SELECT 1
        FROM public.profiles AS existing_profile
       WHERE existing_profile.slug = lower(trim(p_slug))
         AND existing_profile.account_id = v_account.id
         AND existing_profile.profile_type = p_profile_type
    )
  ) THEN$replacement$;
  v_occurrences integer;
BEGIN
  v_function_oid := to_regprocedure('public.activate_card_v2(text,text,text,text,text,text,uuid)');
  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION 'Expected public.activate_card_v2(text,text,text,text,text,text,uuid) was not found; refusing to modify the database.';
  END IF;

  v_definition := pg_get_functiondef(v_function_oid);
  v_occurrences := (
    length(v_definition) - length(replace(v_definition, v_old_condition, ''))
  ) / length(v_old_condition);

  IF v_occurrences <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one known slug ownership condition; found %; refusing to modify the function.',
      v_occurrences;
  END IF;

  v_definition := replace(v_definition, v_old_condition, v_new_condition);
  EXECUTE v_definition;
END
$migration$;
