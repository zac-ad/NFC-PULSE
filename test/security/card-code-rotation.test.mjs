import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("card rotation requires admin authorization and uses the secure generator", () => {
  const source = read("app/api/admin/cards/[id]/rotate/route.ts");
  assert.match(source, /requireAdmin\(request\)/);
  assert.match(source, /generateCardCode\(\)/);
  assert.match(source, /pending_card_code/);
});

test("prepare rotation never replaces the live card code", () => {
  const source = read("app/api/admin/cards/[id]/rotate/route.ts");
  const prepareBlock = source.slice(0, source.indexOf("if (!card.pending_card_code)"));
  assert.match(prepareBlock, /pending_card_code:\s*replacementCode/);
  assert.doesNotMatch(prepareBlock, /(?<!pending_)card_code:\s*replacementCode/);
});

test("finalization swaps to the pending code and clears the pending credential", () => {
  const source = read("app/api/admin/cards/[id]/rotate/route.ts");
  assert.match(source, /card_code:\s*card\.pending_card_code/);
  assert.match(source, /pending_card_code:\s*null/);
  assert.match(source, /pending_card_code_created_at:\s*null/);
  assert.match(source, /oldCodeInvalidated:\s*true/);
});

test("discard removes only the pending code and keeps the live credential", () => {
  const source = read("app/api/admin/cards/[id]/rotate/route.ts");
  assert.match(source, /action === 'discard'/);
  const discardBlock = source.slice(
    source.indexOf("if (action === 'discard')"),
    source.indexOf("// The current code remains valid")
  );
  assert.match(discardBlock, /pending_card_code:\s*null/);
  assert.match(discardBlock, /currentCodeStillActive:\s*true/);
  assert.doesNotMatch(discardBlock, /card_code:\s*card\.pending_card_code/);
});

test("rotation keeps the existing hardware card identity and never inserts a new card", () => {
  const source = read("app/api/admin/cards/[id]/rotate/route.ts");
  assert.doesNotMatch(source, /\.from\(['"]hardware_cards['"]\)\.insert/);
  assert.match(source, /\.eq\(['"]id['"], id\)/);
});

test("rotation has explicit pending-state guards", () => {
  const source = read("app/api/admin/cards/[id]/rotate/route.ts");
  assert.match(source, /already has a pending replacement code/);
  assert.match(source, /No pending replacement code exists/);
});
