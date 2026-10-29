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


test("activation failure never deletes an Auth identity that a concurrent retry may be using", () => {
  const route = read("app/api/activate/route.ts");

  assert.match(route, /retaining the Auth identity for a safe retry/);
  assert.match(route, /accounts\.auth_user_id ON DELETE SET NULL/);
  assert.match(route, /Orphan cleanup must be a separate, age-gated reconciliation process/);
  assert.doesNotMatch(route, /auth\.admin\.deleteUser\(/);
});


test("activation validates the card credential before creating or confirming an Auth identity", () => {
  const route = read("app/api/activate/route.ts");
  const preflight = route.indexOf(".rpc('validate_card_activation_v1'");
  const ensureAuth = route.indexOf("ensureAuthUser(cleanEmail)");
  const activation = route.indexOf(".rpc('activate_card_v2'");

  assert.ok(preflight >= 0, "preflight validation RPC must exist");
  assert.ok(ensureAuth > preflight, "Auth identity must not be created/confirmed before preflight");
  assert.ok(activation > ensureAuth, "final atomic activation must follow Auth preparation");
  assert.match(route, /p_activation_secret_hash: hashActivationSecret\(cleanSecret\)/);
});

test("card activation preflight is service-role-only and performs no writes", () => {
  const migration = read("supabase/migrations/20261028130000_activation_preflight.sql");
  assert.ok(migration.includes("CREATE OR REPLACE FUNCTION public.validate_card_activation_v1"));
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path TO ''/);
  assert.ok(migration.includes("REVOKE ALL ON FUNCTION public.validate_card_activation_v1(text, text, text, text, text) FROM PUBLIC, anon, authenticated"));
  assert.ok(migration.includes("GRANT EXECUTE ON FUNCTION public.validate_card_activation_v1(text, text, text, text, text) TO service_role"));
  assert.doesNotMatch(migration, /\b(?:INSERT|UPDATE|DELETE)\s+INTO?\b/i);
  assert.match(migration, /p_email text/);
  assert.match(migration, /p_slug text/);
  assert.match(migration, /deletion_status/);
  assert.match(migration, /v_slug_profile\.profile_type IS DISTINCT FROM upper\(trim\(p_profile_type\)\)/);
  assert.match(migration, /JOIN public\.accounts AS linked_account/);
  assert.match(migration, /linked_account\.auth_user_id = auth_user\.id/);
  assert.match(migration, /lower\(trim\(linked_account\.email\)\) <> lower\(trim\(p_email\)\)/);
});
