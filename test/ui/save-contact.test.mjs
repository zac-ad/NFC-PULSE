import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("Save to Contacts uses Android Contacts intent without a vCard fallback", () => {
  const source = read("app/p/[slug]/page.tsx");

  assert.match(source, /const handleSaveContact = \(\) =>/);
  assert.match(source, /const isAndroid = \/Android\/i\.test\(userAgent\)/);
  assert.match(source, /action=android\\.intent\\.action\\.INSERT/);
  assert.match(source, /type=vnd\.android\.cursor\.dir\/contact/);
  assert.match(source, /S\.name=\$\{encodeURIComponent\(value\)\}/);
  assert.match(source, /S\.phone=\$\{encodeURIComponent\(value\)\}/);
  assert.match(source, /S\.email=\$\{encodeURIComponent\(value\)\}/);
  assert.doesNotMatch(source, /S\.browser_fallback_url=/);
  assert.match(source, /window\.location\.href = intentUrl/);
  assert.doesNotMatch(source, /<a href=\{`\/api\/vcard\/\$\{profile\.slug\}`/);
});