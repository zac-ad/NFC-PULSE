-- PULSE security hardening v1: database function and public grant lockdown
-- Server-side application code uses the service_role client for these operations.

alter function public.check_rate_limit(text, integer, integer)
  set search_path = public;

alter function public.increment_tap_count(uuid)
  set search_path = public;

alter function public.check_rate_limit(text, integer, integer)
  set strict;

alter function public.increment_tap_count(uuid)
  set strict;

create or replace function public.check_rate_limit(
  p_identifier text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
strict
as $function$
declare
  v_row public.rate_limits;
begin
  if length(p_identifier) = 0 or length(p_identifier) > 255 then
    raise exception 'invalid rate limit identifier';
  end if;

  if p_max_attempts < 1 or p_max_attempts > 100000 then
    raise exception 'invalid rate limit max attempts';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit window';
  end if;

  select * into v_row
  from public.rate_limits
  where identifier = p_identifier
  for update;

  if v_row is null then
    insert into public.rate_limits (identifier, attempt_count, window_start)
    values (p_identifier, 1, now());
    return true;
  end if;

  if extract(epoch from (now() - v_row.window_start)) > p_window_seconds then
    update public.rate_limits
    set attempt_count = 1, window_start = now()
    where identifier = p_identifier;
    return true;
  end if;

  if v_row.attempt_count >= p_max_attempts then
    return false;
  end if;

  update public.rate_limits
  set attempt_count = attempt_count + 1
  where identifier = p_identifier;

  return true;
end;
$function$;

create or replace function public.increment_tap_count(p_card_id uuid)
returns void
language sql
security definer
set search_path = public
strict
as $function$
  update public.hardware_cards
  set tap_count = tap_count + 1
  where id = p_card_id;
$function$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.increment_tap_count(uuid) from public, anon, authenticated;
revoke all on function public.get_or_create_account(text) from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.increment_tap_count(uuid) to service_role;
grant execute on function public.get_or_create_account(text) to service_role;

-- Tap routing now uses supabaseAdmin server-side, so these tables no longer
-- need anonymous table access for the tap path.
revoke all on table public.card_taps from anon;
revoke all on table public.hardware_cards from anon;

-- Keep the dashboard's authenticated read paths available while removing
-- authenticated write access to telemetry.
revoke insert, update, delete, truncate, references, trigger on table public.card_taps from authenticated;
grant select on table public.card_taps to authenticated;
