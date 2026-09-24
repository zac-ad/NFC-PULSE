import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("public projection views are explicitly read-only for browser roles", () => {
  const migration = read("supabase/migrations/20260924232000_public_view_grants_hardening.sql");

  assert.match(migration, /revoke all privileges on table public\.public_profiles from public, anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.public_profile_links from public, anon, authenticated/);
  assert.match(migration, /grant select on table public\.public_profiles to anon, authenticated/);
  assert.match(migration, /grant select on table public\.public_profile_links to anon, authenticated/);
});
