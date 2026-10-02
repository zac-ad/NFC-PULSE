import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation API requires and hashes a separate activation secret", () => {
  const source = read("app/api/activate/route.ts");
  assert.match(source, /activationSecret/);
  assert.match(source, /hashActivationSecret\(cleanSecret\)/);
  assert.match(source, /p_activation_secret_hash/);
  assert.doesNotMatch(source, /p_activation_secret_hash:\s*cleanCode/);
});

test("activation SQL drops the old card-code-only function signature", () => {
  const source = read("supabase/migrations/20260928150000_two_secret_activation.sql");
  assert.match(source, /drop function if exists public\.activate_card\(TEXT, TEXT, TEXT, TEXT, TEXT\)/i);
  assert.match(source, /p_activation_secret_hash\s+TEXT/i);
  assert.match(source, /activation_secret_hash/i);
  assert.match(source, /revoke execute on function public\.activate_card\(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT\)/i);
});

test("activation SQL rejects cards without an issued secret", () => {
  const source = read("supabase/migrations/20260928150000_two_secret_activation.sql");
  assert.match(source, /v_card\.activation_secret_hash IS NULL/);
  assert.match(source, /activation credential/i);
});

test("activation secret is single-use after successful activation", () => {
  const source = read("supabase/migrations/20260928150000_two_secret_activation.sql");
  assert.match(source, /activation_secret_hash = NULL/);
  assert.match(source, /activation_secret_issued_at = NULL/);
});

test("new admin cards receive a separate activation secret", () => {
  const source = read("app/api/admin/cards/route.ts");
  assert.match(source, /generateActivationSecret\(\)/);
  assert.match(source, /hashActivationSecret\(activationSecret\)/);
  assert.match(source, /activationSecret/);
});

test("admin activation-secret issuance is restricted to unclaimed cards", () => {
  const source = read("app/api/admin/cards/[id]/rotate/route.ts");
  assert.match(source, /issue_activation_secret/);
  assert.match(source, /card\.status !== 'UNCLAIMED'/);
  assert.match(source, /generateActivationSecret\(\)/);
  assert.match(source, /hashActivationSecret\(activationSecret\)/);
});

test("activation UI collects the secret separately from the public card code", () => {
  const source = read("app/activate/page.tsx");
  assert.match(source, /id="activation-secret"/);
  assert.match(source, /activationSecret/);
  assert.match(source, /activationSecret:/);
});

test("card release generates and stores a fresh activation secret", () => {
  const source = read("app/api/admin/cards/route.ts");
  const release = source.slice(source.indexOf("if (action === 'release')"));
  assert.match(release, /const activationSecret = generateActivationSecret\(\)/);
  assert.match(release, /activation_secret_hash: hashActivationSecret\(activationSecret\)/);
  assert.match(release, /activation_secret_issued_at/);
  assert.match(release, /activationSecret/);
});


test("activation binds the PULSE account to the exact Auth user", () => {
  const migration = read("supabase/migrations/20261002071402_account_auth_lifecycle.sql");
  const route = read("app/api/activate/route.ts");
  assert.match(migration, /auth_user_id\s+UUID/);
  assert.match(migration, /references auth\.users\(id\)/i);
  assert.match(migration, /p_auth_user_id\s+UUID/);
  assert.match(migration, /The login identity does not match this email address/);
  assert.match(route, /auth\.admin\.getUserById/);
  assert.match(route, /p_auth_user_id:\s*authResult\.userId/);
});

test("activation rolls back a newly-created Auth user when database activation fails", () => {
  const route = read("app/api/activate/route.ts");
  assert.match(route, /authResult\.created/);
  assert.match(route, /auth\.admin\.deleteUser\(userId\)/);
});
