import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("Save to Contacts uses the protected vCard flow on Android and other browsers", () => {
  const source = read("app/p/[slug]/page.tsx");

  assert.match(source, /const handleSaveContact = \(\) =>/);
  assert.match(source, /const vCardUrl = `\/api\/vcard\/\$\{encodeURIComponent\(profile\.slug\)\}`/);
  assert.match(source, /window\.location\.href = vCardUrl/);
  assert.doesNotMatch(source, /action=android\.intent\.action\.INSERT/);
  assert.doesNotMatch(source, /vnd\.android\.cursor\.dir\/raw_contact/);
  assert.doesNotMatch(source, /S\.name=\$\{encodeURIComponent\(value\)\}/);
  assert.doesNotMatch(source, /S\.phone=\$\{encodeURIComponent\(value\)\}/);
  assert.doesNotMatch(source, /S\.email=\$\{encodeURIComponent\(value\)\}/);
});