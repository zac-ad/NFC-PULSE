-- Run this in Supabase SQL Editor.
-- Safe to run once. If you re-run it, the CREATE OR REPLACE FUNCTION lines
-- update cleanly, and the CREATE TABLE IF NOT EXISTS lines just skip.

-- ── Rate limiting ──────────────────────────────────────────────
-- One row per (identifier), where identifier is something like
-- "admin_login:203.0.113.4" — a combination of the endpoint and the
-- caller's IP. Whoever calls check_rate_limit gets back true (allowed)
-- or false (blocked) atomically — the "for update" row lock means two
-- simultaneous requests from the same IP can't both slip through by
-- reading the same stale count at the same time.

create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null unique,
  attempt_count integer not null default 1,
  window_start timestamptz not null default now()
);

create or replace function check_rate_limit(
  p_identifier text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean as $$
declare
  v_row rate_limits;
begin
  select * into v_row from rate_limits where identifier = p_identifier for update;

  if v_row is null then
    insert into rate_limits (identifier, attempt_count, window_start)
    values (p_identifier, 1, now());
    return true;
  end if;

  -- Window expired — reset the counter and allow this request.
  if extract(epoch from (now() - v_row.window_start)) > p_window_seconds then
    update rate_limits set attempt_count = 1, window_start = now()
    where identifier = p_identifier;
    return true;
  end if;

  -- Still inside the window — check if the limit is already hit.
  if v_row.attempt_count >= p_max_attempts then
    return false;
  end if;

  update rate_limits set attempt_count = attempt_count + 1
  where identifier = p_identifier;
  return true;
end;
$$ language plpgsql security definer;

-- Old rows are harmless (they just sit there), but this keeps the table
-- small. Not required to run manually — included for reference.
-- delete from rate_limits where window_start < now() - interval '1 day';


-- ── Admin audit log ────────────────────────────────────────────
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  action text not null,          -- e.g. 'DISABLE_CARD', 'ENABLE_CARD', 'REGISTER_CARD'
  card_code text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_actions_created_at
  on admin_actions (created_at desc);
