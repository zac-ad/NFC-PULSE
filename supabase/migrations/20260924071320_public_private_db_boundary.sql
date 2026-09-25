-- Public/private database boundary hardening
--
-- Browser clients must never read the base profile tables directly.
-- Public access is provided through narrow, read-only views containing
-- only fields that are intentionally public.
--
-- Server routes continue using supabaseAdmin/service_role and therefore
-- retain access to the base tables for authenticated and connected flows.

create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id,
  full_name,
  slug,
  title,
  company,
  bio,
  avatar_url,
  banner_url,
  is_verified,
  is_active,
  profile_type
from public.profiles
where is_active = true;

create or replace view public.public_profile_links
with (security_barrier = true)
as
select
  pl.id,
  pl.profile_id,
  pl.title,
  pl.url,
  pl.type,
  pl.position
from public.profile_links as pl
join public.profiles as p
  on p.id = pl.profile_id
where p.is_active = true
  and pl.visibility = 'public'
  and pl.type <> 'qr';

revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.profile_links from anon, authenticated;

grant select on table public.public_profiles to anon, authenticated;
grant select on table public.public_profile_links to anon, authenticated;
