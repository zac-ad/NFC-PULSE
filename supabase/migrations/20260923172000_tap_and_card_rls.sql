drop policy if exists "Hardware cards lookup for taps" on public.hardware_cards;
create policy "Users can view own hardware cards"
on public.hardware_cards for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = hardware_cards.profile_id
      and profiles.account_id = auth.uid()
  )
);

drop policy if exists "Anyone can log a card tap" on public.card_taps;
drop policy if exists "Users can view own tap telemetry" on public.card_taps;
create policy "Users can view own tap telemetry"
on public.card_taps for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = card_taps.profile_id
      and profiles.account_id = auth.uid()
  )
);