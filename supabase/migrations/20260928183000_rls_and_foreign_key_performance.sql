-- Performance hardening for RLS policies and foreign-key lookups.
--
-- Keep authorization semantics unchanged while avoiding per-row auth.uid()
-- evaluation and ensuring foreign keys have covering indexes.

-- RLS initplan optimization: evaluate auth.uid() once per statement.
drop policy if exists "Users can manage own account" on public.accounts;
create policy "Users can manage own account"
on public.accounts
for all
to public
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to public
with check (account_id = (select auth.uid()));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to public
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

drop policy if exists "Users can manage own links" on public.profile_links;
create policy "Users can manage own links"
on public.profile_links
for insert
to public
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_links.profile_id
      and profiles.account_id = (select auth.uid())
  )
);

create policy "Users can update own links"
on public.profile_links
for update
to public
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_links.profile_id
      and profiles.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_links.profile_id
      and profiles.account_id = (select auth.uid())
  )
);

create policy "Users can delete own links"
on public.profile_links
for delete
to public
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_links.profile_id
      and profiles.account_id = (select auth.uid())
  )
);

drop policy if exists "Users can view own hardware cards" on public.hardware_cards;
create policy "Users can view own hardware cards"
on public.hardware_cards
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = hardware_cards.profile_id
      and profiles.account_id = (select auth.uid())
  )
);

drop policy if exists "Users can view own tap telemetry" on public.card_taps;
create policy "Users can view own tap telemetry"
on public.card_taps
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = card_taps.profile_id
      and profiles.account_id = (select auth.uid())
  )
);

-- Foreign-key covering indexes.
create index if not exists idx_hardware_cards_profile_id
  on public.hardware_cards (profile_id);

create index if not exists idx_profiles_account_id
  on public.profiles (account_id);

create index if not exists idx_viewer_sessions_card_id
  on public.viewer_sessions (card_id);
