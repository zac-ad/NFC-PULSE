import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("performance migration preserves authorization while optimizing RLS evaluation", () => {
  const source = read("supabase/migrations/20260928102249_rls_and_foreign_key_performance.sql");

  assert.match(source, /using \(\(select auth\.uid\(\)\) = id\)/);
  assert.match(source, /with check \(account_id = \(select auth\.uid\(\)\)\)/);
  assert.match(source, /profiles\.account_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(source, /=\s*auth\.uid\(\)/);
  assert.doesNotMatch(source, /auth\.uid\(\)\s*=/);

  assert.match(source, /idx_hardware_cards_profile_id/);
  assert.match(source, /idx_profiles_account_id/);
  assert.match(source, /idx_viewer_sessions_card_id/);
});

test("profile link SELECT remains public while write policies are separated", () => {
  const source = read("supabase/migrations/20260928102249_rls_and_foreign_key_performance.sql");

  assert.match(source, /drop policy if exists "Users can manage own links"/);
  assert.match(source, /for insert/);
  assert.match(source, /"Users can update own links"/);
  assert.match(source, /"Users can delete own links"/);
  assert.doesNotMatch(source, /create policy "Users can manage own links"[\s\S]*for all/);
});


test("redundant profile slug index cleanup preserves the unique slug index", () => {
  const source = read("supabase/migrations/20260928110426_remove_redundant_profiles_slug_index.sql");

  assert.match(source, /drop index if exists public\.idx_profiles_slug/);
  assert.match(source, /profiles_slug_key/);
  assert.doesNotMatch(source, /drop constraint/i);
});
