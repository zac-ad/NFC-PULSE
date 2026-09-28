-- Make public projection views obey the caller's RLS and privileges.
--
-- The projections intentionally expose only public fields. SECURITY INVOKER
-- prevents the postgres-owned view from bypassing the caller's RLS boundary.
-- Browser roles receive only the columns required to evaluate these views.

create or replace view public.public_profiles
with (security_barrier = true, security_invoker = true)
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
with (security_barrier = true, security_invoker = true)
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

grant select (
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
) on table public.profiles to anon, authenticated;

grant select (
  id,
  profile_id,
  title,
  url,
  type,
  position,
  visibility
) on table public.profile_links to anon, authenticated;

revoke all privileges on table public.public_profiles from public, anon, authenticated;
revoke all privileges on table public.public_profile_links from public, anon, authenticated;

grant select on table public.public_profiles to anon, authenticated;
grant select on table public.public_profile_links to anon, authenticated;
