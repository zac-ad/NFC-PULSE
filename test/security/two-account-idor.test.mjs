import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("profile PATCH cannot cross account ownership boundaries", () => {
  const source = read("app/api/profile/route.ts");
  assert.match(
    source,
    /\.from\('profiles'\)\.select\('id'\)\.eq\('id', profileId\)\.eq\('account_id', account\.id\)\.maybeSingle\(\)/
  );
  assert.match(source, /\.from\('profiles'\)\.update\(fields\)\.eq\('id', profileId\)/);
  assert.match(source, /account_id, profile_type, created_at/);
});

test("profile GET is scoped to the authenticated account", () => {
  const source = read("app/api/profile/route.ts");
  assert.match(source, /\.from\('accounts'\)\.select\('id, email'\)\.eq\('email', userEmail\)/);
  assert.match(source, /\.from\('profiles'\)\.select\('\*'\)\.eq\('account_id', account\.id\)/);
});

test("link GET/POST/PATCH/DELETE require ownership before service-role access", () => {
  const source = read("app/api/links/route.ts");
  assert.match(source, /async function verifyProfileOwnership/);
  assert.match(source, /\.eq\('id', profileId\)\.eq\('account_id', account\.id\)/);

  for (const occurrence of [
    "const owns = await verifyProfileOwnership(email, profileId);",
  ]) {
    assert.ok(source.includes(occurrence), "expected ownership verification");
  }

  assert.match(source, /\.eq\('id', linkId\)[\s\S]*?\.eq\('profile_id', profileId\)/);
  assert.match(source, /\.delete\(\)[\s\S]*?\.eq\('id', linkId\)[\s\S]*?\.eq\('profile_id', profileId\)/);
});

test("upload cannot write media for another account's profile", () => {
  const source = read("app/api/upload/route.ts");
  assert.match(
    source,
    /\.from\('profiles'\)\.select\('id'\)\.eq\('id', profileId\)\.eq\('account_id', account\.id\)\.maybeSingle\(\)/
  );
  assert.match(source, /\.from\('profile-media'\)[\s\S]*?\.upload\(path, bytes/);
});

test("enterprise card writes preserve organization ownership", () => {
  const source = read("app/api/enterprise/cards/route.ts");
  assert.match(source, /existing\.org_id !== null/);
  assert.match(source, /existing\.status !== 'UNCLAIMED'/);
  assert.match(source, /\.is\('org_id', null\)\.eq\('status', 'UNCLAIMED'\)/);
  assert.match(source, /\.eq\('org_id', orgId\)/);
});

test("browser roles cannot bypass the database private profile boundary", () => {
  const migration = read(
    "supabase/migrations/20260924071320_public_private_db_boundary.sql"
  );
  const grants = read(
    "supabase/migrations/20260924071741_public_view_grants_hardening.sql"
  );

  assert.match(
    migration,
    /revoke all privileges on table public\.profiles from anon, authenticated/
  );
  assert.match(
    migration,
    /revoke all privileges on table public\.profile_links from anon, authenticated/
  );
  assert.match(grants, /revoke all privileges on table public\.public_profiles from public, anon, authenticated/);
  assert.match(grants, /revoke all privileges on table public\.public_profile_links from public, anon, authenticated/);
});

test("dashboard telemetry reads use an authenticated server route with account ownership checks", () => {
  const route = read("app/api/dashboard/telemetry/route.ts");
  const dashboard = read("app/dashboard/page.tsx");

  assert.match(route, /authHeader\?\.startsWith\('Bearer '\)/);
  assert.match(route, /\.from\('accounts'\)[\s\S]*?\.select\('id'\)[\s\S]*?\.eq\('email', userEmail\)/);
  assert.match(route, /\.from\('profiles'\)[\s\S]*?\.select\('id'\)[\s\S]*?\.eq\('id', profileId\)[\s\S]*?\.eq\('account_id', account\.id\)/);
  assert.match(route, /\.from\('hardware_cards'\)[\s\S]*?\.select\('card_code, tap_count'\)/);
  assert.match(route, /\.from\('card_taps'\)/);
  assert.match(route, /function noStoreJson\(/);
  assert.match(route, /Cache-Control', 'private, no-store, max-age=0'/);

  assert.match(dashboard, /\/api\/dashboard\/telemetry\?profileId=/);
  assert.doesNotMatch(dashboard, /\.from\('hardware_cards'\)/);
  assert.doesNotMatch(dashboard, /\.from\('card_taps'\)/);
});
