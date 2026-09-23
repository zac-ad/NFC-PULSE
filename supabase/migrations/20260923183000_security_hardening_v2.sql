-- Security hardening v2: server-only tables must not be directly reachable
-- by anon/authenticated clients. Application code uses the service role for these tables.

revoke all privileges on table public.admin_actions from anon, authenticated;
revoke all privileges on table public.admin_sessions from anon, authenticated;
revoke all privileges on table public.organizations from anon, authenticated;
revoke all privileges on table public.rate_limits from anon, authenticated;
revoke all privileges on table public.viewer_sessions from anon, authenticated;

grant all privileges on table public.admin_actions to service_role;
grant all privileges on table public.admin_sessions to service_role;
grant all privileges on table public.organizations to service_role;
grant all privileges on table public.rate_limits to service_role;
grant all privileges on table public.viewer_sessions to service_role;
