import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation request is rate limited before parsing input", () => {
  const source = read("app/api/activate/route.ts");
  const limiter = source.indexOf("checkRateLimit");
  const parse = source.indexOf("request.json");
  assert.ok(limiter >= 0);
  assert.ok(parse > limiter);
  assert.match(source, /activation-request:\$\{ip\}/);
});

test("activation request validates and normalizes inputs before pending RPC", () => {
  const source = read("app/api/activate/route.ts");
  assert.match(source, /cleanCode.*toUpperCase/);
  assert.match(source, /cleanEmail.*toLowerCase/);
  assert.match(source, /cleanSlug.*toLowerCase/);
  assert.match(source, /p_activation_secret_hash/);
  assert.match(source, /create_activation_request/);
});

test("request API does not activate or mutate a hardware card directly", () => {
  const source = read("app/api/activate/route.ts");
  assert.doesNotMatch(source, /activate_card/);
  assert.doesNotMatch(source, /\.from\(['"]hardware_cards['"]\)\.(insert|update|upsert|delete)/);
  assert.match(source, /signInWithOtp/);
  assert.match(source, /email_confirm:\s*false/);
});

test("pending activation binds request id in HttpOnly callback cookie", () => {
  const source = read("app/api/activate/route.ts");
  assert.match(source, /pulse_activation_request/);
  assert.match(source, /httpOnly:\s*true/);
  assert.match(source, /path:\s*'\/auth\/callback'/);
  assert.match(source, /maxAge:\s*30\s*\*\s*60/);
});

test("finalization callback exchanges Auth code and verifies session identity", () => {
  const source = read("app/auth/callback/route.ts");
  assert.match(source, /exchangeCodeForSession\(code\)/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /pulse_activation_request/);
  assert.match(source, /finalize_card_activation/);
  assert.match(source, /cookies\.delete\('pulse_activation_request'\)/);
});

test("activation request RPC validates card and creates pending request without claiming it", () => {
  const source = read("supabase/migrations/20261121091000_activation_request_rpc.sql");
  assert.match(source, /create_activation_request/i);
  assert.match(source, /status.*UNCLAIMED/i);
  assert.match(source, /PENDING_EMAIL/i);
  assert.match(source, /interval '30 minutes'/i);
  assert.doesNotMatch(source, /UPDATE public\.hardware_cards\s+SET status\s*=\s*'ACTIVE'/i);
});

test("finalization checks email verification and claims only in finalization RPC", () => {
  const source = read("supabase/migrations/20261121091000_activation_request_rpc.sql");
  assert.match(source, /email_confirmed_at/i);
  assert.match(source, /finalize_card_activation/i);
  assert.match(source, /status\s*=\s*'ACTIVE'/i);
  assert.match(source, /activation_requests/i);
  assert.match(source, /REVOKE EXECUTE/i);
  assert.match(source, /GRANT EXECUTE.*service_role/i);
});

test("rate limiter fails closed when database check errors", () => {
  const source = read("lib/rateLimit.ts");
  assert.match(source, /if \(error\)/);
  assert.match(source, /return false/);
});
