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
  assert.match(source, /response\.cookies\.set\([\s\S]*requestResult\.request_id/);
  assert.doesNotMatch(source, /response\.cookies\.set\([\s\S]*requestData\.request_id/);
  assert.match(source, /searchParams\.set\(\x27request_id\x27, requestResult\.request_id\)/);
});

test("finalization callback exchanges Auth code and verifies session identity", () => {
  const source = read("app/auth/callback/route.ts");
  assert.match(source, /exchangeCodeForSession\(code\)/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /pulse_activation_request/);
  assert.match(source, /finalize_card_activation/);
  assert.match(source, /clearActivationCookie\(success\)/);
});

test("activation request RPC validates card and creates pending request without claiming it", () => {
  const source = read("supabase/migrations/20261121091000_activation_request_rpc.sql");
  const requestRpc = source.split("CREATE OR REPLACE FUNCTION public.finalize_card_activation")[0];
  assert.match(requestRpc, /create_activation_request/i);
  assert.match(requestRpc, /status.*UNCLAIMED/i);
  assert.match(requestRpc, /PENDING_EMAIL/i);
  assert.match(requestRpc, /interval '30 minutes'/i);
  assert.doesNotMatch(requestRpc, /SET status\s*=\s*'ACTIVE'/i);
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
