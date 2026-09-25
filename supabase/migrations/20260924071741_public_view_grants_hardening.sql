-- Tighten privileges on public projection views.
--
-- PostgreSQL can give newly-created views privileges through the PUBLIC role.
-- Keep the public projections strictly read-only for browser roles.

revoke all privileges on table public.public_profiles from public, anon, authenticated;
revoke all privileges on table public.public_profile_links from public, anon, authenticated;

grant select on table public.public_profiles to anon, authenticated;
grant select on table public.public_profile_links to anon, authenticated;
