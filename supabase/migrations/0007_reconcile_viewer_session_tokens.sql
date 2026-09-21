-- Reconcile the production viewer_sessions table created by the earlier raw-token schema.
-- The current application stores only SHA-256 token hashes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.viewer_sessions
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

UPDATE public.viewer_sessions
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL
  AND token IS NOT NULL;

ALTER TABLE public.viewer_sessions
  ALTER COLUMN token_hash SET NOT NULL;

ALTER TABLE public.viewer_sessions
  DROP CONSTRAINT IF EXISTS viewer_sessions_token_hash_key;

ALTER TABLE public.viewer_sessions
  ADD CONSTRAINT viewer_sessions_token_hash_key UNIQUE (token_hash);

ALTER TABLE public.viewer_sessions
  DROP CONSTRAINT IF EXISTS viewer_sessions_token_key;

ALTER TABLE public.viewer_sessions
  DROP COLUMN IF EXISTS token;

CREATE INDEX IF NOT EXISTS viewer_sessions_token_idx
  ON public.viewer_sessions (token_hash);

CREATE INDEX IF NOT EXISTS viewer_sessions_expires_at_idx
  ON public.viewer_sessions (expires_at);

ALTER TABLE public.viewer_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.viewer_sessions FROM public;
REVOKE ALL ON public.viewer_sessions FROM anon;
REVOKE ALL ON public.viewer_sessions FROM authenticated;
GRANT ALL ON public.viewer_sessions TO service_role;
