import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("public projection views use caller RLS and only receive public base columns", () => {
  const migration = read("supabase/migrations/20260928133000_security_invoker_public_views.sql");

  assert.match(migration, /create or replace view public\.public_profiles[\\s\\S]*security_invoker = true/);
  assert.match(migration, /create or replace view public\.public_profile_links[\\s\\S]*security_invoker = true/);
  assert.match(migration, /grant select \([\\s\\S]*full_name[\\s\\S]*profile_type\) on table public\.profiles to anon, authenticated/);
  assert.match(migration, /grant select \([\\s\\S]*visibility[\\s\\S]*\) on table public\.profile_links to anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.profiles from anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.profile_links from anon, authenticated/);
});

test("public views remain read-only for browser roles", () => {
  const migration = read("supabase/migrations/20260928133000_security_invoker_public_views.sql");

  assert.match(migration, /revoke all privileges on table public\.public_profiles from public, anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.public_profile_links from public, anon, authenticated/);
  assert.match(migration, /grant select on table public\.public_profiles to anon, authenticated/);
  assert.match(migration, /grant select on table public\.public_profile_links to anon, authenticated/);
});
