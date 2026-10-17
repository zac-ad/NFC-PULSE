import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("tap telemetry uses one atomic database operation", () => {
  const route = read("app/t/[code]/route.ts");
  const migration = read("supabase/migrations/20260928104500_atomic_tap_telemetry.sql");

  assert.match(route, /supabaseAdmin\.rpc\('record_card_tap'/);
  assert.doesNotMatch(route, /supabaseAdmin\.from\('card_taps'\)\.insert/);
  assert.doesNotMatch(route, /supabaseAdmin\.rpc\('increment_tap_count'/);

  assert.match(migration, /create or replace function public\.record_card_tap/);
  assert.match(migration, /for update/);
  assert.match(migration, /insert into public\.card_taps/);
  assert.match(migration, /update public\.hardware_cards/);
  assert.match(migration, /grant execute on function public\.record_card_tap/);
  assert.match(migration, /revoke all on function public\.record_card_tap/);
});
