import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("rate limiting prefers Vercel's trusted client IP header", () => {
  const source = read("lib/rateLimit.ts");
  assert.match(source, /headers\.get\(['"]x-real-ip['"]\)/);
  assert.match(source, /if \(realIp\)/);
  assert.match(source, /const forwarded = request\.headers\.get\(['"]x-forwarded-for['"]\)/);
});

test("rate limiting does not prefer the client-supplied forwarded chain", () => {
  const source = read("lib/rateLimit.ts");
  const realIpIndex = source.indexOf("const realIp");
  const forwardedIndex = source.indexOf("const forwarded");
  assert.ok(realIpIndex >= 0);
  assert.ok(forwardedIndex > realIpIndex);
});
