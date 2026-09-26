import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("new admin card registration uses server-side cryptographic code generation", () => {
  const source = read("app/api/admin/cards/route.ts");
  assert.match(source, /generateCardCode/);
  assert.doesNotMatch(source, /card_code\s*\}\s*=\s*await request\.json/);
  assert.doesNotMatch(source, /const code = card_code/);
});

test("card code generator uses cryptographic randomness and a large alphabet", () => {
  const source = read("lib/cardCode.ts");
  assert.match(source, /randomBytes\(CODE_BYTES\)/);
  assert.match(source, /const ALPHABET =/);
  assert.match(source, /PULSE-/);
  assert.match(source, /CODE_LENGTH = 26/);
});

test("generated card format is materially larger than the legacy numeric format", () => {
  const source = read("lib/cardCode.ts");
  assert.match(source, /PULSE-.*slice\(13\)/);
  assert.match(source, /ABCDEFGHJKLMNPQRSTUVWXYZ23456789/);
});
