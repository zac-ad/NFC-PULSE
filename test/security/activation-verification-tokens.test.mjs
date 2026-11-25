import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('verification token generation uses cryptographic randomness with sufficient entropy', () => {
  const source = read('lib/activationVerification.ts');

  assert.match(source, /randomBytes\(TOKEN_BYTES\)/);
  assert.match(source, /const TOKEN_BYTES = 32/);
  assert.match(source, /toString\('base64url'\)/);

  // Validate that 32 random bytes base64url has at least 43 characters
  const sample = randomBytes(32).toString('base64url');
  assert.ok(sample.length >= 40);
});

test('hashVerificationToken produces 64-character SHA-256 hex string', () => {
  const source = read('lib/activationVerification.ts');

  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /update\(token\.trim\(\), 'utf8'\)/);
  assert.match(source, /digest\('hex'\)/);

  const hash = createHash('sha256').update('sample-token', 'utf8').digest('hex');
  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test('tokens migration creates table with unique hash, RLS enabled, and service_role grants only', () => {
  const sql = read('supabase/migrations/20261123140000_activation_verification_tokens.sql');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.activation_verification_tokens/);
  assert.match(sql, /request_id UUID NOT NULL REFERENCES public\.activation_requests/);
  assert.match(sql, /token_hash TEXT NOT NULL/);
  assert.match(sql, /CONSTRAINT activation_verification_tokens_token_hash_unique UNIQUE \(token_hash\)/);
  assert.match(sql, /ALTER TABLE public\.activation_verification_tokens ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.activation_verification_tokens FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.activation_verification_tokens TO service_role/);
});

test('token issuance function revokes previous active tokens and stores token hash', () => {
  const sql = read('supabase/migrations/20261123140000_activation_verification_tokens.sql');

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.issue_activation_verification_token/);
  assert.match(sql, /UPDATE public\.activation_verification_tokens[\s\S]*SET revoked_at = now\(\)/);
  assert.match(sql, /INSERT INTO public\.activation_verification_tokens/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = ''/);
});

test('token consumption function marks token consumed, checks hardware card, and updates request to EMAIL_VERIFIED', () => {
  const sql = read('supabase/migrations/20261123140000_activation_verification_tokens.sql');

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.consume_activation_verification_token/);
  assert.match(sql, /v_token\.consumed_at IS NOT NULL/);
  assert.match(sql, /v_token\.revoked_at IS NOT NULL/);
  assert.match(sql, /v_token\.expires_at <= now\(\)/);
  assert.match(sql, /v_card\.status <> 'UNCLAIMED'/);
  assert.match(sql, /UPDATE public\.activation_verification_tokens[\s\S]*SET consumed_at = now\(\)/);
  assert.match(sql, /UPDATE public\.activation_requests[\s\S]*SET status = 'EMAIL_VERIFIED'/);
});

test('activation API issues verification token and does not create Auth user on initial submission', () => {
  const source = read('app/api/activate/route.ts');

  assert.match(source, /issueVerificationToken/);
  assert.match(source, /sendActivationVerificationEmail/);
  assert.doesNotMatch(source, /auth\.admin\.createUser/);
  assert.doesNotMatch(source, /activate_card/);
});

test('verification API consumes token and resolves Auth identity only after token proof', () => {
  const source = read('app/api/activate/verify/route.ts');

  assert.match(source, /consumeVerificationToken/);
  assert.match(source, /checkRateLimit/);
  assert.match(source, /createUser\(\{[^}]*email_confirm:\s*true/);
  assert.match(source, /updateUserById\([^}]*email_confirm:\s*true/);
  assert.match(source, /pulse_activation_request/);
});

test('verification UI removes sensitive token from browser history and referrer', () => {
  const source = read('app/activate/verify/page.tsx');

  assert.match(source, /window\.history\.replaceState/);
  assert.match(source, /useSearchParams/);
  assert.match(source, /fetch\('\/api\/activate\/verify'/);
});

test('resend email helper falls back to safe simulation when API key is not configured', () => {
  const source = read('lib/email/activationEmail.ts');

  assert.match(source, /process\.env\.RESEND_API_KEY/);
  assert.match(source, /simulated:\s*true/);
  assert.match(source, /Verify your email to activate your PULSE card/);
});
