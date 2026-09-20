-- =============================================================================
-- Migration: 0005_viewer_sessions.sql
-- Purpose:   Temporary viewer sessions for NFC tap interactions.
--
-- A viewer session starts when someone physically taps a PULSE card.
-- It expires after 30 minutes of inactivity. The session is purely
-- a privacy/UX layer — it does NOT affect the profile's permanent
-- accessibility via /p/[slug]. Someone with the direct URL always works.
--
-- Security:
--   Only the service role (Next.js API) reads/writes this table.
--   anon and authenticated roles are explicitly revoked.
--   token is a 32-byte random hex string (256-bit entropy).
--   card_id FK ensures sessions are always tied to a real card.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.viewer_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        NOT NULL UNIQUE,
  card_id     UUID        NOT NULL REFERENCES public.hardware_cards(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 minutes'
);

-- Fast token lookup on every profile page load / ping
CREATE INDEX IF NOT EXISTS viewer_sessions_token_idx
  ON public.viewer_sessions (token);

-- Fast cleanup of expired sessions
CREATE INDEX IF NOT EXISTS viewer_sessions_expires_at_idx
  ON public.viewer_sessions (expires_at);

-- No browser client should ever read or write this table
REVOKE ALL ON public.viewer_sessions FROM public;
REVOKE ALL ON public.viewer_sessions FROM anon;
REVOKE ALL ON public.viewer_sessions FROM authenticated;
GRANT ALL ON public.viewer_sessions TO service_role;
