import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("dashboard profile switching ignores stale async responses", () => {
  const source = read("app/dashboard/page.tsx");

  assert.match(source, /const selectionRequestRef = useRef\(0\)/);
  assert.match(source, /const requestId = \+\+selectionRequestRef\.current/);
  assert.match(source, /if \(requestId !== selectionRequestRef\.current\) return/);
  assert.match(source, /if \(requestId === selectionRequestRef\.current\) \{[\s\S]*setSwitchingProfile\(false\)/);
});

test("dashboard surfaces profile loading failures with a retry action", () => {
  const source = read("app/dashboard/page.tsx");

  assert.match(source, /const \[profileLoadError, setProfileLoadError\]/);
  assert.match(source, /Could not load your profiles/);
  assert.match(source, /Could not load your links/);
  assert.match(source, /Could not load your card activity/);
  assert.match(source, /onClick=\{handleRetryProfileLoad\}/);
});

test("dashboard prevents overlapping profile switches", () => {
  const source = read("app/dashboard/page.tsx");

  assert.match(source, /if \(type === activeTab \|\| switchingProfile\) return/);
  assert.match(source, /disabled=\{switchingProfile\}/);
  assert.match(source, /disabled:cursor-wait/);
});
