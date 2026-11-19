-- Repeat the Auth identity binding check inside the final activation transaction.
-- Preflight is advisory because Auth can change between preflight and activation.
DO $migration$
DECLARE
  v_function_oid oid;
  v_definition text;
  v_marker text := E'  SELECT id, auth_user_id, deletion_status\n    INTO v_account\n    FROM public.accounts\n   WHERE email = lower(trim(p_email))\n     FOR UPDATE;';
  v_guard text := E'  -- A login identity already bound to another account must never be rebound\n  -- through activation, even if its current Auth email matches the submitted email.\n  IF EXISTS (\n    SELECT 1\n      FROM public.accounts AS linked_account\n     WHERE linked_account.auth_user_id = p_auth_user_id\n       AND lower(trim(linked_account.email)) <> lower(trim(p_email))\n  ) THEN\n    RETURN json_build_object(\'error\', \'This login identity is already connected to another PULSE account.\');\n  END IF;\n\n';
BEGIN
  v_function_oid := to_regprocedure('public.activate_card_v2(text,text,text,text,text,text,uuid)');
  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION 'Expected public.activate_card_v2(text,text,text,text,text,text,uuid) was not found; refusing to modify the database.';
  END IF;

  v_definition := pg_get_functiondef(v_function_oid);
  IF length(v_definition) - length(replace(v_definition, v_marker, '')) <> length(v_marker) THEN
    RAISE EXCEPTION 'Expected account lookup marker was not found exactly once; refusing to modify the function.';
  END IF;
  IF position('linked_account.auth_user_id = p_auth_user_id' in v_definition) > 0 THEN
    RAISE EXCEPTION 'Auth identity binding guard already exists; refusing to apply it twice.';
  END IF;

  v_definition := replace(v_definition, v_marker, v_guard || v_marker);
  EXECUTE v_definition;
END
$migration$;
