import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("magic-link callback exchanges the Supabase auth code before safe redirect", () => {
  const callback = read("app/auth/callback/route.ts");

  assert.match(callback, /searchParams\.get\(["']code["']\)/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /requestedNext = requestUrl\.searchParams\.get\('next'\) \|\| '\/dashboard'/);
  assert.match(callback, /requestedNext\.startsWith\('\/'\) && !requestedNext\.startsWith\('\/\/'\)/);
  assert.match(callback, /new URL\(safeNext, request\.url\)/);
});

test("magic-link callers use the server auth callback", () => {
  for (const path of [
    "app/portal/professional/login/page.tsx",
    "app/portal/personal/login/page.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /\/auth\/callback\?next=%2Fdashboard/);
  }
});

test("legacy activation callback cannot finalize or bind a card", () => {
  const callback = read("app/auth/callback/route.ts");
  assert.match(callback, /flow.*activation/);
  assert.match(callback, /activation=legacy-link/);
  assert.doesNotMatch(callback, /finalize_card_activation/);
  assert.doesNotMatch(callback, /pulse_activation_request/);
});
