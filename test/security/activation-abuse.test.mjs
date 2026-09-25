import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation rate limit runs before parsing or database activation", () => {
  const source = read("app/api/activate/route.ts");
  const limiter = source.indexOf("checkRateLimit");
  const parse = source.indexOf("request.json");
  const rpc = source.indexOf(".rpc('activate_card'");
  assert.ok(limiter >= 0);
  assert.ok(parse > limiter);
  assert.ok(rpc > limiter);
  assert.match(source, /checkRateLimit\(\`activation:\$\{ip\}\`, 5, 600\)/);
});

test("activation normalizes card codes before the atomic RPC", () => {
  const source = read("app/api/activate/route.ts");
  assert.match(source, /const cleanCode\s*=\s*String\(cardCode\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(source, /p_card_code:\s*cleanCode/);
});

test("activation maps claimed, missing, and concurrent-card states to non-success responses", () => {
  const source = read("app/api/activate/route.ts");
  assert.match(source, /already been activated.*409/);
  assert.match(source, /couldn\\'t find that card.*404/);
  assert.match(source, /being activated right now.*409/);
});

test("atomic activation is the only database write path in the route", () => {
  const source = read("app/api/activate/route.ts");
  assert.equal((source.match(/\.rpc\(/g) || []).length, 1);
  assert.match(source, /\.rpc\('activate_card'/);
  assert.doesNotMatch(source, /\.from\(['"]hardware_cards['"]\)\.(insert|update|upsert|delete)/);
});

test("activate_card is exposed only through the server-side function path", () => {
  const source = read("supabase/migrations/0003_atomic_activation.sql");
  assert.match(source, /create or replace function public\.activate_card/i);
  assert.match(source, /security definer/i);
  assert.match(source, /revoke all on function public\.activate_card/i);
  assert.match(source, /grant execute on function public\.activate_card/i);
});

test("activation function locks the card row and only accepts UNCLAIMED cards", () => {
  const source = read("supabase/migrations/0003_atomic_activation.sql");
  assert.match(source, /for update nowait/i);
  assert.match(source, /status\s*<>\s*'UNCLAIMED'|status\s*=\s*'UNCLAIMED'/i);
  assert.match(source, /update public\.hardware_cards/i);
});

test("activation creates or reuses the requested profile type without cross-account slug takeover", () => {
  const source = read("supabase/migrations/0003_atomic_activation.sql");
  assert.match(source, /profile_type/i);
  assert.match(source, /slug/i);
  assert.match(source, /account_id/i);
  assert.match(source, /already.*taken|taken/i);
});

test("activation rate limiter fails closed when its database check fails", () => {
  const source = read("lib/rateLimit.ts");
  assert.match(source, /if \(error\)/);
  assert.match(source, /return false/);
});
