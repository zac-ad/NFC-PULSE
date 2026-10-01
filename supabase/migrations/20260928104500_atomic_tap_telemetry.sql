-- Keep tap telemetry and the aggregate tap counter in one transaction.
-- The tap route must not leave one side updated when the other fails.

create or replace function public.record_card_tap(
  p_card_id uuid,
  p_profile_id uuid,
  p_ip_address text,
  p_city text,
  p_region text,
  p_country text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
strict
as $function$
declare
  v_profile_id uuid;
  v_status text;
begin
  select profile_id, status
    into v_profile_id, v_status
  from public.hardware_cards
  where id = p_card_id
  for update;

  if v_status is distinct from 'ACTIVE' or v_profile_id is distinct from p_profile_id then
    raise exception 'card is not active for the supplied profile';
  end if;

  insert into public.card_taps (
    card_id,
    profile_id,
    ip_address,
    city,
    region,
    country,
    user_agent
  )
  values (
    p_card_id,
    p_profile_id,
    p_ip_address,
    p_city,
    p_region,
    p_country,
    p_user_agent
  );

  update public.hardware_cards
  set tap_count = tap_count + 1
  where id = p_card_id;
end;
$function$;

revoke all on function public.record_card_tap(
  uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.record_card_tap(
  uuid, uuid, text, text, text, text, text
) to service_role;
