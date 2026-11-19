\set ON_ERROR_STOP on

-- Fresh disposable PostgreSQL database fixture. Never run against production.
CREATE TABLE public.hardware_cards (
  card_code text NOT NULL CONSTRAINT hardware_cards_card_code_key UNIQUE
);
CREATE INDEX idx_hardware_cards_card_code ON public.hardware_cards (card_code);

CREATE TABLE public.viewer_sessions (
  token_hash text NOT NULL CONSTRAINT viewer_sessions_token_hash_key UNIQUE
);
CREATE INDEX viewer_sessions_token_idx ON public.viewer_sessions (token_hash);

CREATE TABLE public.admin_sessions (
  session_id text NOT NULL CONSTRAINT admin_sessions_session_id_key UNIQUE
);
CREATE INDEX admin_sessions_session_id_idx ON public.admin_sessions (session_id);

\ir ../../supabase/migrations/20261119080000_remove_duplicate_indexes.sql

DO $test$
DECLARE
  v_name text;
  v_expected_unique text[] := ARRAY[
    'hardware_cards_card_code_key',
    'viewer_sessions_token_hash_key',
    'admin_sessions_session_id_key'
  ];
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'idx_hardware_cards_card_code',
    'viewer_sessions_token_idx',
    'admin_sessions_session_id_idx'
  ] LOOP
    IF to_regclass(format('public.%I', v_name)) IS NOT NULL THEN
      RAISE EXCEPTION 'Redundant index % still exists after migration', v_name;
    END IF;
  END LOOP;

  FOREACH v_name IN ARRAY v_expected_unique LOOP
    IF to_regclass(format('public.%I', v_name)) IS NULL THEN
      RAISE EXCEPTION 'Required unique index % was removed or is missing', v_name;
    END IF;
  END LOOP;

  BEGIN
    INSERT INTO public.hardware_cards(card_code) VALUES ('duplicate-check');
    INSERT INTO public.hardware_cards(card_code) VALUES ('duplicate-check');
    RAISE EXCEPTION 'Unique constraint on hardware_cards.card_code was not enforced';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.viewer_sessions(token_hash) VALUES ('duplicate-check');
    INSERT INTO public.viewer_sessions(token_hash) VALUES ('duplicate-check');
    RAISE EXCEPTION 'Unique constraint on viewer_sessions.token_hash was not enforced';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.admin_sessions(session_id) VALUES ('duplicate-check');
    INSERT INTO public.admin_sessions(session_id) VALUES ('duplicate-check');
    RAISE EXCEPTION 'Unique constraint on admin_sessions.session_id was not enforced';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$test$;

SELECT 'duplicate-index-cleanup integration test passed' AS result;
