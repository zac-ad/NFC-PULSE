import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('activation retry requires a UUID request id and verified authenticated user', () => {
  const source = read('app/api/activate/retry/route.ts');
  assert.match(source, /UUID_RE/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /email_confirmed_at/);
  assert.match(source, /user\.id/);
});

test('activation retry rate-limits and only calls atomic finalization RPC', () => {
  const source = read('app/api/activate/retry/route.ts');
  assert.match(source, /activation-retry:/);
  assert.match(source, /finalize_card_activation/);
  assert.doesNotMatch(source, /\.from\(['"]hardware_cards['"]\)\.(insert|update|upsert|delete)/);
});

test('callback preserves the activation request id for retry after finalization failure', () => {
  const source = read('app/auth/callback/route.ts');
  assert.match(source, /\/activate\/retry/);
  assert.match(source, /searchParams\.set\('request_id', activationRequestId\)/);
  assert.match(source, /retryRedirect\('retry'\)/);
});

test('retry page calls the authenticated retry endpoint and handles success and failure', () => {
  const source = read('app/activate/retry/page.tsx');
  assert.match(source, /fetch\('\/api\/activate\/retry'/);
  assert.match(source, /requestId/);
  assert.match(source, /Retry activation/);
  assert.match(source, /router\.replace\('\/dashboard\?activated=1'\)/);
  assert.match(source, /role="alert"/);
});
