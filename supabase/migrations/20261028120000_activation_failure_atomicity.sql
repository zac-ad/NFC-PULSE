-- Make the last-card-update failure transactional in the live activation function.
-- This function was introduced directly in the database and is not defined in the
-- repository's earlier migrations, so patch its existing definition narrowly.
DO $migration$
DECLARE
  v_function_oid oid;
  v_definition text;
  v_old_branch text := $$RETURN json_build_object('error', 'This card was just claimed by someone else. Please try again.');$$;
  v_new_branch text := $$RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'This card was just claimed by someone else. Please try again.';$$;
  v_old_handler text := 'WHEN OTHERS THEN';
  v_new_handler text := $$WHEN SQLSTATE 'P0001' THEN
      RETURN json_build_object('error', SQLERRM);
    WHEN OTHERS THEN$$;
BEGIN
  v_function_oid := to_regprocedure('public.activate_card_v2(text,text,text,text,text,text,uuid)');
  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION 'Expected public.activate_card_v2(text,text,text,text,text,text,uuid) was not found; refusing to modify the database.';
  END IF;

  v_definition := pg_get_functiondef(v_function_oid);

  IF length(v_definition) - length(replace(v_definition, v_old_branch, '')) <> length(v_old_branch) THEN
    RAISE EXCEPTION 'Expected late activation failure branch was not found exactly once; refusing to modify the function.';
  END IF;
  IF length(v_definition) - length(replace(v_definition, v_old_handler, '')) <> length(v_old_handler) THEN
    RAISE EXCEPTION 'Expected single catch-all exception handler was not found; refusing to modify the function.';
  END IF;

  v_definition := replace(v_definition, v_old_branch, v_new_branch);
  v_definition := replace(v_definition, v_old_handler, v_new_handler);
  EXECUTE v_definition;
END
$migration$;
