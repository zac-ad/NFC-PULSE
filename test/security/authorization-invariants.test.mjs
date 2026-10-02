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
  assert.match(source, /\.eq\('id', linkId\)/);
  assert.match(source, /\.eq\('profile_id', profileId\)/);
  assert.match(source, /\.neq\('type', 'qr'\)/);
});

test("viewer sessions use a hashed 32-byte token and are bound to an active card", () => {
  const tap = read("app/t/[code]/route.ts");
  const session = read("app/api/viewer-session/route.ts");
  const profileView = read("app/api/profile-view/[slug]/route.ts");
  const vcard = read("app/api/vcard/[slug]/route.ts");

  assert.match(tap, /randomBytes\(32\)/);
  assert.match(tap, /createHash\('sha256'\)\.update\(token\)/);
  assert.match(tap, /card\.status === 'ACTIVE' && card\.profile_id/);

  assert.match(session, /token\.length !== 64/);
  assert.match(session, /card\.status !== 'ACTIVE'/);
  assert.match(session, /delete\(\)\.eq\('id', session\.id\)/);

  assert.match(profileView, /card\.status !== 'ACTIVE' \|\| card\.profile_id !== profile\.id/);
  assert.match(vcard, /card\.status !== 'ACTIVE' \|\| card\.profile_id !== profile\.id/);
});

test("viewer-session responses are explicitly non-cacheable", () => {
  const source = read("app/api/viewer-session/route.ts");
  assert.match(source, /function noStoreJson\(/);
  assert.match(source, /response\.headers\.set\('Cache-Control', 'private, no-store, max-age=0'\)/);
  assert.doesNotMatch(source, /return NextResponse\.json\(/);

  const directJsonResponses = source.match(/const response = NextResponse\.json\(/g) || [];
  assert.equal(directJsonResponses.length, 1, "NextResponse.json should only be constructed inside the noStoreJson helper");
});

test("vCard responses use a safe filename and are explicitly non-cacheable", () => {
  const source = read("app/api/vcard/[slug]/route.ts");
  assert.match(source, /const safeFilename = slug\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9-\]\/g, ''\)\.slice\(0, 80\) \|\| 'pulse-contact'/);
  assert.match(source, /filename=\\"\$\{safeFilename\}\.vcf\\"/);
  assert.match(source, /response\.headers\.set\('Cache-Control', 'private, no-store, max-age=0'\)/);
});

test("vCard rejects requests without a valid viewer session", () => {
  const source = read("app/api/vcard/[slug]/route.ts");
  assert.match(source, /return NextResponse\.json\(\{ error: 'A PULSE connection is required\.' \}, \{ status: 403 \}\)/);
});

test("activation is rate-limited before the database operation", () => {
  const source = read("app/api/activate/route.ts");
  const rateLimitIndex = source.indexOf("checkRateLimit");
  const rpcIndex = source.indexOf("supabaseAdmin.rpc('activate_card_v2'");
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


test("activation provisions a confirmed Auth user and login never creates one", () => {
  const activation = read("app/api/activate/route.ts");
  assert.match(activation, /auth\.admin\.createUser\(\{[\s\S]*email,[\s\S]*email_confirm: true/);
  assert.match(activation, /auth\.admin\.updateUserById\([\s\S]*email_confirm: true/);

  for (const path of [
    "app/login/page.tsx",
    "app/activate/page.tsx",
    "app/portal/professional/login/page.tsx",
    "app/portal/personal/login/page.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /shouldCreateUser: false/);
  }
});
test("least-privilege migration removes browser write privileges", () => {
  const migration = read("supabase/migrations/20260924022007_least_privilege_grants.sql");
  assert.match(migration, /revoke all privileges on table public\.accounts from anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.profiles from anon, authenticated/);
  assert.match(migration, /grant select on table public\.profiles to anon, authenticated/);
  assert.match(migration, /revoke all privileges on table public\.profile_links from anon, authenticated/);
  assert.match(migration, /grant select on table public\.profile_links to anon, authenticated/);
});
test("admin user deletion is resumable and uses the exact Auth identity", () => {
  const source = read("app/api/admin/users/route.ts");
  const migration = read("supabase/migrations/20261002071402_account_auth_lifecycle.sql");
  assert.match(migration, /deletion_status TEXT NOT NULL DEFAULT 'ACTIVE'/);
  assert.match(source, /auth_user_id/);
  assert.match(source, /deletion_status/);
  assert.match(source, /status: 'DELETING'/);
  assert.match(source, /auth\.admin\.deleteUser\(/);
  assert.doesNotMatch(source, /auth\.admin\.listUsers/);
  assert.match(source, /status: 'UNCLAIMED'/);
  assert.match(source, /profile_id: null/);
  assert.match(source, /tap_count: 0/);
  assert.match(source, /pending_card_code: null/);
  assert.match(source, /activation_secret_hash: hashActivationSecret\(activationSecret\)/);
  assert.match(source, /viewer_sessions/);
  assert.match(source, /profile-media/);
  assert.doesNotMatch(source, /nfc_protection_status:/);
});

test("admin NFC controls are grouped as advanced hardware actions", () => {
  const source = read("app/admin/AdminDashboardClient.tsx");
  assert.match(source, /Advanced hardware/);
  assert.match(source, /Physical NFC controls/);
  assert.match(source, /NFC password/);
});

