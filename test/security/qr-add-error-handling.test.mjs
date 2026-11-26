import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("links POST rejects non-PULSE QR image URLs with a 400 instead of throwing", () => {
  const route = read("app/api/links/route.ts");
  assert.match(route, /request\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(route, /type === 'qr' && !getProfileMediaPath\(String\(url\)\)/);
  const guard = route.indexOf("!getProfileMediaPath(String(url))");
  const canonical = route.indexOf("canonicalProfileMediaUrl(String(url))");
  assert.ok(guard > -1 && canonical > guard, "validation must run before canonicalization");
});

test("dashboard apiCall returns an error object for non-JSON or failed requests", () => {
  const page = read("app/dashboard/page.tsx");
  assert.match(page, /res\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(page, /Request failed \(HTTP \$\{res\.status\}\)/);
  assert.match(page, /Network error\. Check your connection/);
});
