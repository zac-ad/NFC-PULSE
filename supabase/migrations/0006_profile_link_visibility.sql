-- Per-link visibility for PULSE profiles.
-- Existing links stay public so this change does not unexpectedly hide anything.
ALTER TABLE public.profile_links
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

ALTER TABLE public.profile_links
  DROP CONSTRAINT IF EXISTS profile_links_visibility_check;

ALTER TABLE public.profile_links
  ADD CONSTRAINT profile_links_visibility_check
  CHECK (visibility IN ('public', 'tap'));

-- Payment QR codes remain private by default because they are intended to be
-- available through a physical PULSE connection, not a public profile URL.
UPDATE public.profile_links
SET visibility = 'tap'
WHERE type = 'qr';
