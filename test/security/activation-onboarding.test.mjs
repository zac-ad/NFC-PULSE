import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation success screen distinguishes email delivery from portal fallback", () => {
  const source = read("app/activate/page.tsx");

  assert.match(source, /const \[loginLinkSent, setLoginLinkSent\]/);
  assert.match(source, /setLoginLinkSent\(false\)/);
  assert.match(source, /setLoginLinkSent\(true\)/);
  assert.match(source, /loginLinkSent \? 'Check your email\.' : 'Your card is active\.'/);
});

test("activation submit state exposes busy status", () => {
  const source = read("app/activate/page.tsx");
  assert.match(source, /disabled=\{loading \|\| !consent \|\| !!slugError\}/);
  assert.match(source, /aria-busy=\{loading\}/);
});
