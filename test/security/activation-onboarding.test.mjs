import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation success UI communicates pending email verification", () => {
  const source = read("app/activate/page.tsx");
  assert.match(source, /setLoginLinkSent\(true\)/);
  assert.match(source, /Check your email\./);
  assert.match(source, /Activation pending/);
  assert.match(source, /verify ownership and finish activating your card/);
  assert.doesNotMatch(source, /Your card is active\./);
});

test("activation form exposes busy status and requires consent", () => {
  const source = read("app/activate/page.tsx");
  assert.match(source, /disabled=\{loading \|\| !consent \|\| !!slugError\}/);
  assert.match(source, /aria-busy=\{loading\}/);
  assert.match(source, /if \(!consent\)/);
});

test("activation form calls pending API rather than browser-side activation", () => {
  const source = read("app/activate/page.tsx");
  assert.match(source, /fetch\('\/api\/activate'/);
  assert.doesNotMatch(source, /supabase\.rpc\(['"]activate_card/);
});
