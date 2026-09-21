-- Per-link visibility for PULSE profiles.
-- Existing links stay public so this change does not unexpectedly hide anything.
ALTER TABLE public.profile_links
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

ALTER TABLE public.profile_links
  DROP CONSTRAINT IF EXISTS profile_links_visibility_check;

ALTER TABLE public.profile_links
  ADD CONSTRAINT profile_links_visibility_check
  CHECK (visibility IN ('public', 'tap'));
