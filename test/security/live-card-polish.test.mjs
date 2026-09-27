import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("live card interactive controls expose accessible state", () => {
  const source = read("app/p/[slug]/page.tsx");

  assert.match(source, /aria-label="Share profile"/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /aria-controls=\{\`pulse-qr-\$\{qr\.id\}\`\}/);
  assert.match(source, /id=\{\`pulse-qr-\$\{qr\.id\}\`\}/);
  assert.match(source, /aria-busy="true"/);
});
