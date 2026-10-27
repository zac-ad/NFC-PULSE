import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("activation late card-claim failure raises so earlier writes roll back", () => {
  const migration = read("supabase/migrations/20261028120000_activation_failure_atomicity.sql");

  assert.match(migration, /to_regprocedure\('public\.activate_card_v2\(text,text,text,text,text,text,uuid\)'\)/);
  assert.match(migration, /Expected late activation failure branch was not found exactly once/);
  assert.match(migration, /RAISE EXCEPTION USING ERRCODE = 'PZ001'/);
  assert.match(migration, /WHEN SQLSTATE 'PZ001' THEN\s+RETURN json_build_object\('error', SQLERRM\)/);
  assert.match(migration, /WHEN OTHERS THEN/);
  assert.match(migration, /EXECUTE v_definition/);
  assert.doesNotMatch(migration, /DROP FUNCTION/i);
});

test("activation atomicity migration leaves function security and permissions untouched", () => {
  const migration = read("supabase/migrations/20261028120000_activation_failure_atomicity.sql");

  assert.doesNotMatch(migration, /\b(?:GRANT|REVOKE)\b/i);
  assert.doesNotMatch(migration, /SECURITY\s+(?:DEFINER|INVOKER)/i);
  assert.doesNotMatch(migration, /ALTER\s+FUNCTION/i);
});
