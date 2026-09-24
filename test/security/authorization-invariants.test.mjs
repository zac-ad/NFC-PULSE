import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("profile API keeps an explicit mutation allowlist", () => {
  const source = read("app/api/profile/route.ts");
  assert.match(source, /const allowedFields = \[/);
  assert.match(source, /'full_name'/);
  assert.match(source, /'is_active'/);
  assert.doesNotMatch(source, /account_id.*allowedFields/);
  assert.doesNotMatch(source, /profile_type.*allowedFields/);
  assert.match(source, /\.eq\('id', profileId\)\.eq\('account_id', account\.id\)/);
});

test("link mutations require profile ownership and scope by both identifiers", () => {
  const source = read("app/api/links/route.ts");
  assert.match(source, /verifyProfileOwnership\(email, profileId\)/);
  assert.match(source, /\.eq\('id', linkId\)\.eq\('profile_id', profileId\)/);
  assert.match(source, /\.neq\('type', 'qr'\)/);
});

test("viewer sessions use a hashed 32-byte token and are bound to an active card", () => {
  const tap = read("app/t/[code]/route.ts");
  const session = read("app/api/viewer-session/route.ts");
  const profileView = read("app/api/profile-view/[slug]/route.ts");
  const vcard = read("app/api/vcard/[slug]/route.ts");

  assert.match(tap, /randomBytes\(32\)/);
  assert.match(tap, /createHash\('sha256'\)\.update\(token\)/);
  assert.match(tap, /status: 'ACTIVE'/);

  assert.match(session, /token\.length !== 64/);
  assert.match(session, /card\.status !== 'ACTIVE'/);
  assert.match(session, /delete\(\)\.eq\('id', session\.id\)/);

  assert.match(profileView, /card\.status !== 'ACTIVE' \|\| card\.profile_id !== profile\.id/);
  assert.match(vcard, /card\.status !== 'ACTIVE' \|\| card\.profile_id !== profile\.id/);
});

test("vCard rejects requests without a valid viewer session", () => {
  const source = read("app/api/vcard/[slug]/route.ts");
  assert.match(source, /return NextResponse\.json\(\{ error: 'A PULSE connection is required\.' \}, \{ status: 403 \}\)/);
  assert.match(source, /'Cache-Control': 'private, no-store'/);
});

test("activation is rate-limited before the database operation", () => {
  const source = read("app/api/activate/route.ts");
  const rateLimitIndex = source.indexOf("checkRateLimit");
  const rpcIndex = source.indexOf("supabaseAdmin.rpc('activate_card'");
  assert.ok(rateLimitIndex >= 0);
  assert.ok(rpcIndex >= 0);
  assert.ok(rateLimitIndex < rpcIndex);
  assert.match(source, /5, 600/);
});

test("public media cannot be returned from the private bucket without a signed URL", () => {
  const media = read("lib/profileMedia.ts");
  const profileView = read("app/api/profile-view/[slug]/route.ts");
  assert.match(media, /PROFILE_MEDIA_BUCKET = 'profile-media'/);
  assert.match(media, /createSignedUrl\(path, expiresIn\)/);
  assert.match(profileView, /signedProfileMediaUrl\(/);
});

test("least-privilege migration removes browser write privileges", () => {
  const migration = read("supabase/migrations/20260924220000_least_privilege_grants.sql");
  assert.match(migration, /revoke all privileges on table public\.accounts from anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.profiles from anon, authenticated/);
  assert.match(migration, /grant select on table public\.profiles to anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.profile_links from anon, authenticated/);
  assert.match(migration, /grant select on table public\.profile_links to anon, authenticated/);
});
