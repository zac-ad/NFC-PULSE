# PULSE Activation Verification — Token Lifecycle and Existing-Account Resume

Status: Proposed design; not implementation or release approval.
Branch: `security/email-verification-activation`

## 1. Security boundaries

- The verification token proves control of the email address used for this pending activation. It is not a login credential and must never create an Auth session.
- The activation request ID is an internal identifier only. Possession of it is not proof of email ownership.
- The card code and activation secret prove card activation eligibility; they do not prove email ownership.
- Card/account/profile writes occur only in a reviewed atomic finalization transaction after email proof and authenticated identity validation.
- No Supabase Auth identity is created, confirmed, bound, or modified when the initial activation request is submitted.

## 2. Proposed data model

Keep `activation_requests` as the request record, but remove the assumption that an Auth user must exist while the request is pending. Its lifecycle should be explicit:

`PENDING_EMAIL → EMAIL_VERIFIED → AWAITING_SIGN_IN → COMPLETED`

Terminal/alternate states: `EXPIRED`, `CANCELLED`, and `FAILED_RECOVERABLE` (only if a documented recovery operation can resume it; do not use failure states as a substitute for retry semantics).

The request stores normalized email, card ID, activation-secret hash, selected profile data, created/expiry timestamps, verification timestamp, and eventual Auth user ID. The Auth user ID is nullable until identity is safely established. Pending request rows must not have an Auth-user foreign-key requirement.

Add a separate `activation_verification_tokens` table:
- `id` UUID primary key
- `request_id` foreign key to `activation_requests`
- `token_hash` fixed-length SHA-256 hash; raw token never stored
- `created_at`, `expires_at`, `consumed_at`, `revoked_at`
- `purpose` fixed to activation verification (not a general login/reset token)
- Index on request ID and expiry; unique token hash
- RLS enabled, no client policies or grants; service-role only

Only one active, unconsumed token per request should exist. Resend creates a fresh token and revokes the prior one in the same database transaction. Resend is rate-limited by IP and request, and must not extend the activation-request expiry indefinitely.

## 3. Token creation and delivery

1. Validate inputs and card credential; create a pending activation request. Do not touch Supabase Auth.
2. Generate a cryptographically secure random token (at least 32 random bytes; URL-safe encoding).
3. Store only its SHA-256 hash with a short expiry no later than the request expiry.
4. Send a dedicated PULSE activation email through the configured transactional email sender. The URL contains the token only; it does not contain the request ID, card code, activation secret, or email address.
5. Never log the raw token or verification URL. Configure the verification response with no-store and a restrictive referrer policy. Avoid third-party content on the token-redemption page.

If sending fails, revoke the unsent token and leave the request safely pending with a retry/resend path. Do not claim activation succeeded.

## 4. Verification endpoint and atomic token consumption

The token link should land on a PULSE-owned route, for example `/activate/verify?token=<opaque-token>`. The token is a short-lived bearer proof, so treat it as sensitive even though it is not a login credential.

The endpoint must:
1. Validate token format and length; hash it immediately.
2. Call a service-role-only SQL function that locks the token and request rows.
3. Confirm token hash exists, token is not consumed/revoked/expired, request is `PENDING_EMAIL`, request is not expired, and card/request binding is still eligible.
4. Consume the token exactly once and move the request to `EMAIL_VERIFIED` in the same transaction.
5. Return only a generic outcome and a tokenless redirect. Do not keep the bearer token in browser history, referrer, analytics, logs, or subsequent URLs.

Concurrency invariant: exactly one transaction may consume a token. Concurrent redemption attempts must produce one successful state transition and all others fail safely.

Token redemption must not create, confirm, update, or sign in an Auth user. It only records that the request email was proven.

## 5. Identity resolution after proof

Identity operations occur only after the request reaches `EMAIL_VERIFIED`. They must be idempotent and resumable.

### A. No Auth identity exists for the normalized email
- Create the Auth identity only after proof.
- Confirm the email only as a direct result of that successful proof.
- Do not generate a session or auto-login from verification.
- Move the request to `AWAITING_SIGN_IN` and show a sign-in/resume action.

### B. Existing confirmed identity, exact normalized email
- Do not change credentials, metadata, confirmation state, or Auth ID.
- Do not automatically sign in or bind the identity.
- Keep the request verified and awaiting sign-in.
- Require the user to use the normal PULSE sign-in flow, then resume activation from an authenticated endpoint.

### C. Existing unconfirmed identity, exact normalized email
- After proof, confirm only the exact matched Auth user.
- Do not change password, metadata, phone, or other identity fields.
- Do not automatically sign in.
- Require normal sign-in and resume.

### D. Mismatch, ambiguous identity, or identity already bound elsewhere
- Stop without confirmation, account changes, or card/profile writes.
- Return an enumeration-safe recovery message.
- Never select an Auth user solely from an untrusted request ID or caller-provided user ID.

Identity lookup must use a reliable exact-email admin lookup and handle pagination/duplicate ambiguity explicitly. If the Auth API cannot prove one exact match, fail closed.

## 6. Authenticated activation resume

Provide a resume endpoint requiring a valid authenticated session.

It must:
- Obtain the Auth user ID and email from server-verified session data (`getUser`), never from request body.
- Require normalized Auth email to equal the request's normalized email.
- Require the Auth user's email to be confirmed.
- Require request state `EMAIL_VERIFIED` or `AWAITING_SIGN_IN`, and request/card expiry and state to remain valid.
- Check that the Auth user ID is not bound to a different account.
- Lock the request/card and finalize account/profile/card binding in one transaction.
- Recheck slug ownership and account deletion state in the finalization RPC.
- Record request completion and verified Auth user ID.
- Return idempotent success for a retry by the same verified Auth user; reject a different user.

This endpoint is the only path from email proof to card/account binding. Email verification alone cannot finalize activation or log a user in.

## 7. Recovery, retry, and resend

- Verification send failure: request stays pending; revoke the failed token; user may retry under limits.
- Token expired: request remains unclaimed; user starts a new request or uses an explicitly safe resend action while the request is valid.
- Token replay: reject; never finalize twice.
- Verified but Auth creation/confirmation temporarily fails: retain `EMAIL_VERIFIED` state and allow a bounded idempotent retry; do not require the email token again.
- Existing confirmed account: verification remains recorded; user signs in normally, then resumes. No repeated token needed while request remains valid.
- Existing unconfirmed account: after proof and exact identity resolution, confirmation can be retried safely; then user signs in normally.
- Sign-in or resume failure: do not consume the verified request. Allow a safe resume until request expiry.
- Concurrent requests for one card: lock card during request creation and allow at most one active pending/verified activation request for the card. A new request must safely supersede the old one according to explicit state rules.
- Late finalization error: raise inside the transaction so every account/profile/card/request write rolls back. No partial claim.
- Request expiry: expire request and revoke active verification tokens. Never alter an already-activated card.

## 8. Proposed RPC boundaries

Service-role-only functions, each with empty `search_path`, qualified objects, explicit grants, and transaction locks:

1. `create_activation_request`: validates card/activation credential and creates pending request; no Auth writes.
2. `issue_activation_verification_token`: stores token hash, supersedes previous active token, returns request/token metadata needed for sender (never raw stored).
3. `consume_activation_verification_token`: locks token + request, validates expiry/state/bindings, consumes token and transitions request to `EMAIL_VERIFIED`.
4. `set_activation_identity` (or application-level idempotent operation with strict checks): records the exact Auth ID only after verified-email identity resolution; must not permit arbitrary caller-supplied ID binding.
5. `finalize_card_activation`: requires authenticated resume and verified request identity, locks request/card/account, rechecks all invariants, performs all binding writes, and marks completed atomically.

Avoid splitting finalization writes across API calls. Auth Admin operations cannot be part of the Postgres transaction, so the request state must make these steps resumable without opening a binding shortcut.

## 9. Required test cases before implementation acceptance

- Token generated with cryptographic randomness and raw token never persisted.
- Hash lookup succeeds; malformed/unknown token fails generically.
- Expired, revoked, consumed, and superseded tokens fail.
- Token cannot be used for another request/email/card.
- Two simultaneous redemption attempts: only one state transition succeeds.
- Request/token expiry and resend rotation.
- Email sender failure leaves no usable token and no Auth/card mutation.
- New email: create/confirm only after token proof; no session creation.
- Existing confirmed user: no confirmation, credential, metadata, or session mutation; activation resume only after normal sign-in.
- Existing unconfirmed user: confirm exact identity only after proof; no unrelated field mutation; no auto-session.
- Duplicate/ambiguous email identity lookup fails closed.
- Auth user bound to another account rejected.
- Resume request ID is not sufficient without a verified session.
- Auth email mismatch/unconfirmed email rejected.
- Concurrent card requests and activation finalization.
- Slug collision, account deletion state, card credential mismatch, card already claimed.
- Finalization late failure rolls back every DB write.
- Completed request retries by same user return idempotent success; different user rejected.
- Token redemption route does not leak token in logs, referrer, analytics, cache, or subsequent URL.
- Full typecheck/lint/test/build and fresh CI against final branch SHA.

## 10. Release boundary

This document is a design proposal only. It does not authorize implementation changes, migration application, PR merge, or deployment. PR #64 remains draft. Production remains untouched until separately approved.
