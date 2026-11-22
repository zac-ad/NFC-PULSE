import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation request is rate limited before parsing input", () => {
  const source = read("app/api/activate/route.ts");
  assert.ok(source.indexOf("checkRateLimit") >= 0);
  assert.ok(source.indexOf("request.json") > source.indexOf("checkRateLimit"));
  assert.match(source, /activation-request:\$\{ip\}/);
});

test("activation request validates and normalizes input before request RPC", () => {
  const source = read("app/api/activate/route.ts");
  assert.match(source, /cleanCode.*toUpperCase/);
  assert.match(source, /cleanEmail.*toLowerCase/);
  assert.match(source, /cleanSlug.*toLowerCase/);
  assert.match(source, /p_activation_secret_hash/);
  assert.match(source, /create_activation_request/);
});

test("activation request does not create an Auth identity or browser session", () => {
  const source = read("app/api/activate/route.ts");
  assert.doesNotMatch(source, /createUser/);
  assert.doesNotMatch(source, /signInWithOtp/);
  assert.doesNotMatch(source, /email_confirm/);
  assert.doesNotMatch(source, /pulse_activation_request/);
});

test("verification route hashes opaque token and rate limits requests", () => {
  const source = read("app/api/activate/verify/route.ts");
  assert.match(source, /checkRateLimit/);
  assert.match(source, /hashActivationVerificationToken/);
  assert.match(source, /consume_activation_verification_token/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.match(source, /Referrer-Policy.*no-referrer/);
});

test("verification UI requires explicit POST action; GET alone cannot redeem token", () => {
  const source = read("app/activate/verify/page.tsx");
  assert.match(source, /fetch\('\/api\/activate\/verify'/);
  assert.match(source, /method: 'POST'/);
  assert.match(source, /router\.replace\('\/activate\/verify'/);
  assert.match(source, /Verify email/);
});

test("resume API derives identity from server-verified auth session", () => {
  const source = read("app/api/activate/resume/route.ts");
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /user\.email_confirmed_at/);
  assert.match(source, /p_auth_user_id:\s*user\.id/);
  assert.doesNotMatch(source, /p_auth_user_id:\s*request/);
});

test("finalization migration requires token-verified awaiting-sign-in state", () => {
  const source = read("supabase/migrations/20261122141000_activation_finalize_requires_verified_email.sql");
  assert.match(source, /status <> 'AWAITING_SIGN_IN'/);
  assert.match(source, /email_confirmed_at/);
  assert.match(source, /finalize_card_activation/);
});

test("verification tokens use cryptographic randomness and hashes", () => {
  const source = read("lib/activationVerificationToken.ts");
  assert.match(source, /randomBytes\(32\)/);
  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /base64url/);
});

test("token lifecycle SQL provides single-use and revocation controls", () => {
  const source = read("supabase/migrations/20261122140000_activation_verification_tokens.sql");
  assert.match(source, /activation_verification_tokens/);
  assert.match(source, /consumed_at/);
  assert.match(source, /revoked_at/);
  assert.match(source, /FOR UPDATE NOWAIT/);
  assert.match(source, /AWAITING_SIGN_IN/);
  assert.match(source, /GRANT EXECUTE.*service_role/);
});

test("legacy auth callback cannot finalize card activation", () => {
  const source = read("app/auth/callback/route.ts");
  assert.match(source, /flow.*activation/);
  assert.match(source, /activation=legacy-link/);
  assert.doesNotMatch(source, /finalize_card_activation/);
});

test("rate limiter fails closed when database check errors", () => {
  const source = read("lib/rateLimit.ts");
  assert.match(source, /if \(error\)/);
  assert.match(source, /return false/);
});
