-- Remove three non-unique indexes that exactly duplicate existing unique indexes.
-- This migration intentionally preserves the unique indexes/constraints.
--
-- Safety:
--   * Verify the expected table and both indexes exist.
--   * Verify the duplicate index is non-unique, valid, ready, non-partial,
--     and has no expression columns.
--   * Verify the unique counterpart is valid/ready and has identical key
--     columns, operator classes, collations, options, and access method.
--   * Abort rather than drop anything if the live definitions differ.

DO $migration$
DECLARE
  v_pair record;
  v_redundant record;
  v_unique record;
  v_redundant_oid oid;
  v_unique_oid oid;
BEGIN
  FOR v_pair IN
    SELECT *
    FROM (VALUES
      ('public', 'hardware_cards', 'idx_hardware_cards_card_code', 'hardware_cards_card_code_key'),
      ('public', 'viewer_sessions', 'viewer_sessions_token_idx', 'viewer_sessions_token_hash_key'),
      ('public', 'admin_sessions', 'admin_sessions_session_id_idx', 'admin_sessions_session_id_key')
    ) AS pairs(schema_name, table_name, redundant_index, unique_index)
  LOOP
    v_redundant_oid := to_regclass(format('%I.%I', v_pair.schema_name, v_pair.redundant_index));
    v_unique_oid := to_regclass(format('%I.%I', v_pair.schema_name, v_pair.unique_index));

    IF v_redundant_oid IS NULL THEN
      CONTINUE;
    END IF;

    IF to_regclass(format('%I.%I', v_pair.schema_name, v_pair.table_name)) IS NULL THEN
      RAISE EXCEPTION 'Expected table %.% is missing; refusing to remove index %',
        v_pair.schema_name, v_pair.table_name, v_pair.redundant_index;
    END IF;

    IF v_unique_oid IS NULL THEN
      RAISE EXCEPTION 'Expected unique counterpart % is missing; refusing to remove index %',
        v_pair.unique_index, v_pair.redundant_index;
    END IF;

    SELECT i.*, ic.relam AS access_method
      INTO v_redundant
      FROM pg_index AS i
      JOIN pg_class AS ic ON ic.oid = i.indexrelid
     WHERE i.indexrelid = v_redundant_oid
       AND i.indrelid = to_regclass(format('%I.%I', v_pair.schema_name, v_pair.table_name));

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Index % is not attached to expected table %.%; refusing to drop',
        v_pair.redundant_index, v_pair.schema_name, v_pair.table_name;
    END IF;

    SELECT i.*, ic.relam AS access_method
      INTO v_unique
      FROM pg_index AS i
      JOIN pg_class AS ic ON ic.oid = i.indexrelid
     WHERE i.indexrelid = v_unique_oid
       AND i.indrelid = to_regclass(format('%I.%I', v_pair.schema_name, v_pair.table_name));

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Index % is not attached to expected table %.%',
        v_pair.unique_index, v_pair.schema_name, v_pair.table_name;
    END IF;

    IF v_redundant.indisunique
       OR v_redundant.indisprimary
       OR NOT v_redundant.indisvalid
       OR NOT v_redundant.indisready
       OR v_redundant.indpred IS NOT NULL
       OR v_redundant.indexprs IS NOT NULL THEN
      RAISE EXCEPTION 'Index % is not the expected plain, non-unique duplicate; refusing to drop',
        v_pair.redundant_index;
    END IF;

    IF NOT v_unique.indisunique
       OR NOT v_unique.indisvalid
       OR NOT v_unique.indisready
       OR v_unique.indpred IS NOT NULL
       OR v_unique.indexprs IS NOT NULL THEN
      RAISE EXCEPTION 'Index % is not a valid plain unique counterpart; refusing to drop %',
        v_pair.unique_index, v_pair.redundant_index;
    END IF;

    IF v_redundant.indkey::text <> v_unique.indkey::text
       OR v_redundant.indclass::text <> v_unique.indclass::text
       OR v_redundant.indcollation::text <> v_unique.indcollation::text
       OR v_redundant.indoption::text <> v_unique.indoption::text
       OR v_redundant.indnatts <> v_unique.indnatts
       OR v_redundant.indnkeyatts <> v_unique.indnkeyatts
       OR v_redundant.access_method <> v_unique.access_method THEN
      RAISE EXCEPTION 'Index definitions % and % differ; refusing to drop duplicate',
        v_pair.redundant_index, v_pair.unique_index;
    END IF;

    EXECUTE format('DROP INDEX %I.%I', v_pair.schema_name, v_pair.redundant_index);
  END LOOP;
END;
$migration$;
