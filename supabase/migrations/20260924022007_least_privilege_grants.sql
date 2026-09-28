-- Least-privilege table grants for the public API boundary.
--
-- PULSE currently performs profile/account/link mutations through authenticated
-- Next.js server routes using service_role. The browser only needs public
-- SELECT access to active profiles and their public links.
--
-- Keep RLS policies in place as a second authorization layer, but remove
-- unnecessary table privileges from anon/authenticated roles so the database
-- cannot be mutated directly through the public PostgREST surface.

-- accounts are server-owned; no browser table access is required.
revoke all privileges on table public.accounts from anon, authenticated;

-- profiles are publicly readable through the existing RLS policy, but all
-- writes go through the authenticated server APIs.
revoke all privileges on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;

-- profile_links are publicly readable through the existing RLS policy, but
-- writes go through /api/links after server-side ownership verification.
revoke all privileges on table public.profile_links from anon, authenticated;
grant select on table public.profile_links to anon, authenticated;
