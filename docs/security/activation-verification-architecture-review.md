# Activation Verification Architecture Review

Status: Design review committed on the activation branch; not implementation approval.
Branch: `security/email-verification-activation`
Reviewed head: `fc0b0f807df07ba106f7619b15909820c8431aa5`
Review date: 2026-11-22

## Executive decision

PR #64 is not merge-ready. The current code still creates or retains an Auth identity before email ownership is proven and sends a Supabase OTP link from an ephemeral server-side client. The branch's callback then exchanges the Auth code and finalizes card activation. This does not meet the PULSE-owned verification-token direction.

The safer target is a PULSE verification process that proves control of the activation email, without creating an Auth session. Account authentication and activation finalization are separate steps.

## Confirmed implementation issues

1. **Auth side effect occurs before email proof.** `app/api/activate/route.ts calls `auth.admin.createUser({ email, email_confirm: false })` before the email is verified. The pending activation request should be the only database side effect at request submission.
2. **Ephemeral PKCE/session client is used for OTP issuance.** The route creates a temporary client with `persistSession: false`; it cannot reliably retain the PKCE verifier across a device/browser handoff. The activation verification link must not depend on this.
3. **Supabase Auth callback is still the activation verifier.** `app/auth/callback/route.ts exchanges an Auth code and then calls finalization. This couples activation proof to the portal's Auth callback and makes verification potentially session-forming.
4. **Request ID is not proof.** The callback obtains a request ID from the query or cookie. A request ID can correlate the request, but it is not a bearer proof of email control.
5. **The current migration lacks the proposed state model and token table.** The request status constraint currently only permits `PENDING_EMAIL`, `COMPLETED`, `EXPIRED`, and `CANCELLED`. There is no verification-token table, consumed-token state, or atomic token-consumption RPC.
6. **Finalization accepts pending requests.** `finalize_card_activation` currently requires `PENDING_EMAIL` plus a confirmed Auth user, instead of requiring PULSE token proof and then a separately authenticated matching identity.
7. **Existing accounts need explicit resume.** Email proof must not automatically log in, bind, alter credentials, or confirm a different identity. Existing confirmed users must sign in normally and resume activation with an authenticated session.
8. **Email delivery integration is not wired yet.** Resend is a package dependency, but the activation branch has not established sender configuration, a dedicated sender implementation, or verified environment variables. Configuration must be checked without exposing secrets.

## Target lifecycle

`PENDING_EMAIL → EMAIL_VERIFIED → AWAITING_SIGN_IN → COMPLETED`

Terminal states: `EXPIRED`, `CANCELLED`. A `FAILED_RECOVERABLE` state may only be introduced if it has a defined retry operation; prefer keeping a request in a valid resumable state rather than using failure as a vague bucket.

### State transitions

| From | To | Authorized operation | Conditions |
|---|---|---|---|
| none | PENDING_EMAIL | Create request | Card and activation credential valid; input valid; request rate limit passes |
| PENDING_EMAIL | EMAIL_VERIFIED | Redeem PULSE token | Token hash matches; request/email/card binding matches; both expiries valid; token unused; locks acquired |
| EMAIL_VERIFIED | AWAITING_SIGN_IN | Identity resolution | Proof recorded; identity resolution is unambiguous; no session is created |
| EMAIL_VERIFIED / AWAITING_SIGN_IN | COMPLETED | Authenticated resume/finalize | Server-verified user session; exact normalized email match; email confirmed; account binding valid; card still eligible; slug available; atomic writes |
| PENDING_EMAIL | EXPIRED | Expiry operation | Request expiry reached |
| PENDING_EMAIL / EMAIL_VERIFIED / AWAITING_SIGN_IN | CANCELLED | Replacement/cancel operation | Explicitly invalidates associated unused tokens; no card/account writes |

No route may skip the required proof or identity gates. All transitions must be enforced by SQL/RPC, not only by route-level checks.

## Token design

- Generate a token with a cryptographically secure random source: minimum 32 random bytes, encoded as URL-safe text.
- Store only SHA-256(token), never the raw token or verification URL.
- Bind the token to one activation request; the request already binds the normalized email, card ID, activation credential hash, selected profile fields, and expiry.
- Token expiry must be no later than request expiry. Use a short validity period, with a proposed 30-minute maximum.
- Use a dedicated table with token ID, request ID, hash, purpose, created/expiry/consumed/revoked timestamps, and unique hash.
- Permit at most one active token per request. Resend generates a fresh token and revokes the previous token atomically. Resend limits apply by IP and request and cannot extend request expiry indefinitely.
- Token redemption must lock token and request rows and consume the token while transitioning the request in one transaction. Concurrent redemption must result in exactly one successful consumption.
- Verification URLs contain only the opaque token. They must not contain request IDs, card codes, activation secrets, or email addresses.
- Verification pages/routes must use no-store responses, a restrictive Referrer-Policy, no third-party assets, and must scrub the token from the URL after redemption. Do not log token values or full URLs.

## Request submission and email delivery

1. Validate and normalize fields; rate limit the request.
2. Verify the card code and activation secret inside the request-creation RPC while locking the card row.
3. Create/reuse the pending request according to documented duplicate-request rules. Do not create, confirm, update, bind, or sign in any Auth identity at this stage.
4. Generate the verification token and persist its hash.
5. Send the dedicated activation email through the configured Resend integration. Use a PULSE-owned verify route and clear action text.
6. If delivery fails, revoke the token and leave the request unclaimed/resumable through a controlled retry/resend. Do not show success.
7. Avoid revealing whether a card, account, or email already exists in public responses.

Email delivery must not be performed inside the SQL transaction. The request/token creation and delivery need a recoverable status/outbox pattern or equivalent idempotent operation so a transient send failure cannot leave an unusable request or create multiple live tokens.

## Verification endpoint

The PULSE route receives the opaque token, validates shape, hashes it immediately, and calls a service-role-only consume RPC.

The consume RPC must lock the token and request, verify:
- token exists and is for activation purpose;
- token is unused, unrevoked, and not expired;
- request is `PENDING_EMAIL` and not expired;
- normalized request email binding is intact;
- card/request credential binding remains valid and card is still eligible;
- no conflicting activation has completed.

Then it marks token consumed and request `EMAIL_VERIFIED` in the same transaction. The route returns a generic success and tokenless redirect. It does not create/confirm Auth users, set session cookies, or sign in.

## Identity resolution and safe resume

### No Auth user for verified email
After successful PULSE token proof, create the identity. Confirmation is allowed only as a direct consequence of proof and for the exact normalized email. Do not create a session. Request becomes `AWAITING_SIGN_IN`; user must use normal sign-in and then resume.

### Existing confirmed identity
Do not modify or confirm the identity, credentials, metadata, or email. Do not sign in automatically. Leave request verified/awaiting sign-in and require normal portal sign-in followed by authenticated resume.

### Existing unconfirmed identity
After token proof, confirming the exact unambiguous user may be considered. Do not modify credentials, metadata, or unrelated identity fields; do not sign in automatically. Resume requires normal authentication.

### Ambiguous/mismatched/bound identity
Fail closed. Do not confirm, bind, alter, or activate. Show generic recovery instructions. Auth user lookup must use a reliable exact-email Admin lookup, handle pagination, and stop if ambiguity exists.

## Authenticated resume and finalization

The resume endpoint must:
- obtain user ID and email from server-verified session data via `getUser()`, not request JSON;
- require normalized Auth email to equal request email;
- require Auth email confirmed;
- require request state `EMAIL_VERIFIED` or `AWAITING_SIGN_IN`;
- verify request/card/token state and expiry as appropriate;
- ensure the Auth user is not bound to another account;
- lock request/card/account/profile records as needed;
- perform account/profile/card writes in one transaction;
- make same-user retries idempotent and reject a different user;
- enforce slug ownership and the one-card/two-profile rules that are already in the schema;
- consume/complete the request atomically with finalization.

The SQL finalization function must not accept caller-provided user IDs as proof of identity. The route may pass a user ID obtained from a verified server session, and SQL must still enforce all matching constraints. Consider a narrowly scoped server-only RPC or trusted identity assertion strategy; review grants and function ownership before implementation.

## Minimum database objects and RPCs

- `activation_requests`: explicit lifecycle, nullable Auth user ID until identity/resume is safe, request expiry, normalized email and bound card/profile details.
- `activation_verification_tokens`: hashed single-use tokens, expiry, consumption/revocation timestamps, unique hash, request FK.
- `create_activation_request`: validates card credential and creates pending request; no Auth mutations.
- `create_activation_verification_token`: generates/stores token hash or receives hash generated by server; only service role; revokes prior active token atomically.
- `consume_activation_verification_token`: token/request locking, checks, and single-use state transition atomically.
- `finalize_card_activation`: only from verified/awaiting state and with verified matching Auth identity; card/account/profile writes and request completion atomic.
- Optional `resend_activation_verification`: rate-limited, replaces token without extending request expiry.

Review constraints: SECURITY DEFINER functions use empty search_path, fully qualified objects, narrowly scoped grants, and defensive validation. RLS remains enabled with no client policies on sensitive token/request tables. No raw token or secret data in RPC return values.

## Required tests before merge

### Token lifecycle
- valid redemption once;
- malformed, unknown, expired, revoked, and replayed tokens;
- token/request/email/card binding mismatch;
- token/request expiry relationship;
- resend invalidates old token and rate limits;
- no raw token stored or logged;
- two simultaneous redemptions, exactly one succeeds.

### Request lifecycle
- request submission creates no Auth user and changes no card claim state;
- invalid card/credential does not create request or Auth identity;
- duplicate request and card lock contention are safe;
- delivery failure can recover and never reports success;
- expired request/token cleanup is safe.

### Identity and resume
- new user: create only after proof, no automatic session;
- existing confirmed: no Auth changes and no auto-login;
- existing unconfirmed: exact-user confirmation only after proof;
- email mismatch, duplicate/ambiguous lookup, or identity bound elsewhere: fail closed;
- user can sign in and resume from a different device;
- request cannot be resumed by a different Auth user.

### Finalization
- slug collision, profile-type collision, claimed card, changed activation credential, account deletion state, and binding mismatch reject cleanly;
- rollback after any intermediate write leaves no partial account/profile/card state;
- same identity retry is idempotent;
- different identity retry is rejected;
- concurrent requests for one card yield at most one activation.

## Review findings on current draft SQL

- The current finalization RPC accepts `PENDING_EMAIL` requests and checks only Supabase email confirmation. It must be redesigned to require PULSE token proof state.
- Current activation request table status check lacks `EMAIL_VERIFIED` and `AWAITING_SIGN_IN`.
- The current callback uses Supabase Auth code exchange and a request ID query/cookie. This must be removed from activation verification; do not change standard portal sign-in callback behavior unintentionally.
- The current request route creates an unconfirmed Auth user before proof and issues Supabase OTP. Remove both from the activation-request path.
- The request ID should never be embedded as the verification link's proof. It may be used internally after token redemption.

## Release gates

1. Implement token schema, RPCs, and PULSE-owned email sending only on the branch.
2. Ensure delivery retry/recovery does not create multiple live tokens or extend expiry.
3. Add integration tests for the entire state machine and identity cases.
4. Review SQL grants, RLS, locks, uniqueness, rollback, and concurrency.
5. Run lint, typecheck, tests, build, security regression workflow on final head.
6. Verify preview on final head and inspect the activation UI.
7. Verify sender/redirect configuration without revealing secrets.
8. Keep PR #64 draft and do not merge/deploy/apply production migrations until explicit release approval.

## Production safety

This review is documentation-only. No production migrations, Auth changes, merges, or deployments were performed.
