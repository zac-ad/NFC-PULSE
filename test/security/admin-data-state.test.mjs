import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../app/admin/AdminDashboardClient.tsx", import.meta.url),
  "utf8"
);

test("admin fleet loading exposes a recoverable error state", () => {
  assert.match(source, /const \[loadError, setLoadError\]/);
  assert.match(source, /Could not load fleet data/);
  assert.match(source, /Could not load activity/);
  assert.match(source, /fetchCards\(\); fetchActions\(\)/);
  assert.match(source, />\s*Retry\s*<\/button>/);
});

test("admin cards table can scroll horizontally on narrow screens", () => {
  assert.match(source, /overflow-x-auto/);
});
