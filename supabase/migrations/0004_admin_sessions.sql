-- =============================================================================
-- Migration: 0004_admin_sessions.sql
-- Purpose:   Server-side admin session table with expiry and revocation.
--
-- Why server-side sessions instead of a signed token:
--   A signed HMAC token is valid until it expires — there is no way to
--   revoke it if it is stolen. A server-side session record lets the
--   admin logout route set revoked_at, making the stolen credential
--   immediately useless.
--
-- Security:
--   RLS disabled — this table is only ever accessed by the service role
--   via supabaseAdmin. The anon/authenticated roles never touch it.
--   REVOKE is applied explicitly below.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT        NOT NULL UNIQUE,  -- random 32-byte hex, stored in cookie
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,                  -- set on logout; NULL = still valid
  ip           TEXT,                         -- recorded for audit; NOT enforced
  user_agent   TEXT
);

-- Fast lookup by session_id on every request
CREATE INDEX IF NOT EXISTS admin_sessions_session_id_idx
  ON public.admin_sessions (session_id);

-- Fast cleanup of expired sessions
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx
  ON public.admin_sessions (expires_at);

-- No browser client should ever read or write this table
REVOKE ALL ON public.admin_sessions FROM public;
REVOKE ALL ON public.admin_sessions FROM anon;
REVOKE ALL ON public.admin_sessions FROM authenticated;
GRANT ALL ON public.admin_sessions TO service_role;

-- Periodically clean up old sessions (Postgres cron or manual)
-- Run this manually or via pg_cron if available:
-- DELETE FROM public.admin_sessions WHERE expires_at < now() - INTERVAL '7 days';
