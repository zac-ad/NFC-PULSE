import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260930100000_ntag215_password_protection.sql', 'utf8');
const generator = fs.readFileSync('lib/nfcPassword.ts', 'utf8');
const route = fs.readFileSync('app/api/admin/cards/[id]/rotate/route.ts', 'utf8');

test('NTAG21x password is exactly 4 random bytes represented as hex', () => {
  assert.match(generator, /randomBytes\(NFC_PASSWORD_BYTES\)/);
  assert.match(generator, /NFC_PASSWORD_BYTES = 4/);
  assert.match(generator, /toString\('hex'\)/);
});

test('NFC password is stored through Supabase Vault, not hardware_cards plaintext', () => {
  assert.match(migration, /vault\.create_secret/);
  assert.match(migration, /vault\.update_secret/);
  assert.match(migration, /nfc_password_secret_id/);
  assert.doesNotMatch(migration, /nfc_password\s+text/i);
  assert.match(migration, /revoke all on function public\.get_nfc_password\(uuid\) from public,anon,authenticated/);
  assert.match(migration, /grant execute on function public\.get_nfc_password\(uuid\) to service_role/);
});

test('admin route supports issue, retrieve, and physical protection state transitions', () => {
  for (const action of [
    'issue_nfc_password',
    'get_nfc_password',
    'mark_nfc_protected',
    'mark_nfc_unprotected',
  ]) {
    assert.match(route, new RegExp(action));
  }
  assert.match(route, /requireAdmin\(request\)/);
  assert.match(route, /store_nfc_password/);
  assert.match(route, /get_nfc_password/);
});
