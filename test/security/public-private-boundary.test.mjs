import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("database public profile projection excludes private contact and ownership fields", () => {
  const migration = read("supabase/migrations/20260924071320_public_private_db_boundary.sql");

  assert.match(migration, /create or replace view public\.public_profiles/);
  assert.match(migration, /where is_active = true/);
  assert.doesNotMatch(migration, /select[\s\S]*phone[\s\S]*email/);
  assert.doesNotMatch(migration, /select[\s\S]*account_id/);
  assert.match(migration, /revoke all privileges on table public\.profiles from anon, authenticated/);
  assert.match(migration, /grant select on table public\.public_profiles to anon, authenticated/);
});

test("database public link projection only exposes public non-QR links", () => {
  const migration = read("supabase/migrations/20260924071320_public_private_db_boundary.sql");

  assert.match(migration, /create or replace view public\.public_profile_links/);
  assert.match(migration, /pl\.visibility = 'public'/);
  assert.match(migration, /pl\.type <> 'qr'/);
  assert.match(migration, /revoke all privileges on table public\.profile_links from anon, authenticated/);
  assert.match(migration, /grant select on table public\.public_profile_links to anon, authenticated/);
});


test("connected profile responses are explicitly private and non-cacheable", () => {
  const route = read("app/api/profile-view/[slug]/route.ts");

  assert.match(
    route,
    /response\.headers\.set\(['"]Cache-Control['"],\s*['"]private, no-store, max-age=0['"]\)/
  );
  assert.match(route, /connected:\s*true/);
  assert.match(route, /phone:\s*profile\.phone\s*\|\|\s*['"]['"]/);
});
