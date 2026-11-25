# PULSE Activation Verification — Design Decision

## User experience
Activation should be a short, clear flow:
1. Enter card details and profile information.
2. Receive an email with one clear **Verify email and activate card** action.
3. Verify on any device.
4. Land on a success screen with a direct next action.

The interface should explain expired links and resend actions in plain language. No technical terminology, avoid repeated form entry where safely possible.

## Existing implementation findings
- The activation request currently creates/retains an unconfirmed Supabase Auth user.
- It then calls `signInWithOtp` through a temporary server-created client with no persisted PKCE verifier.
- The callback exchanges the email code through a browser/session Supabase client.
- The activation request ID is passed in the email redirect query string.
- The current finalization RPC requires an existing Auth user whose email is confirmed.
- `resend` is a dependency, but repository searches found no existing sender integration or environment-variable usage.
- Existing activation request and finalization SQL use service-role-only RPCs and card locking.

## Architecture constraints
- Do not use a server-created ephemeral PKCE client for an email link that must be redeemed in another browser/device.
- Do not accept the request ID alone as proof of email ownership.
- Do not automatically confirm an Auth identity before proving email ownership.
- Do not modify the standard portal sign-in flow or its email template as part of activation.
- Keep activation token material out of logs and never store raw tokens in the database.
- Verification must be bound to the pending request, normalized email, expiry, and card credential hash.
- Verification must be single-use; finalization must be atomic and idempotent.
- Never leave the card claimed if later account/profile writes fail.

## Proposed verification design (pending implementation validation)
1. Pending activation request is created after card-code/credential validation.
2. Generate a high-entropy, single-use PULSE verification token. Persist only a cryptographic hash.
3. Send a dedicated activation email using the existing Resend dependency, after confirming the required configuration. The email uses a PULSE-owned verification route, not the standard portal callback.
4. Verification endpoint validates token hash, request status, request expiry, email binding, and card/request state.
5. The verified-email/Auth identity relationship must be established safely through Supabase Auth Admin APIs. Existing confirmed users, existing unconfirmed users, and mismatched Auth identities require distinct safe handling. Do not auto-confirm or bind an unrelated Auth identity.
6. Once identity verification is safely established, invoke the existing atomic finalization RPC (or a reviewed replacement) to complete account/profile/card writes.
7. Mark the verification token consumed and request completed transactionally. Ensure concurrency and retry behavior are safe.
8. Provide clear success, expired, already-used, and resend states without leaking whether a card/email/account exists.

## Identity handling decision
Email proof from a PULSE activation token proves control of the request email address, but it does not automatically prove the user can access an existing PULSE Auth identity or safely establish a logged-in session.

- **No Auth user for the email:** only create the Auth identity after the PULSE email token has been successfully validated. Confirming the email during creation is permitted only as a direct consequence of that validated proof; never create/confirm on the initial activation-request submission.
- **Existing confirmed Auth user with exact normalized email:** do not silently replace credentials, create a duplicate, or automatically log the user into that account. Complete the card/account binding only if the flow can establish a safe authenticated identity/session for that existing user; otherwise require the existing sign-in flow after email verification and provide a clear resume step.
- **Existing unconfirmed Auth user with exact normalized email:** after token proof, confirming the email may be considered, but do not change password, metadata, or other identity properties. Confirm only the exact matched user and ensure the activation can resume without an unsafe account-binding shortcut.
- **Email mismatch, conflicting account binding, or ambiguous identity:** stop safely; do not bind or confirm. Give a generic recovery message.
- Account binding must remain a separate, validated step and the activation finalization RPC must continue enforcing the email and Auth-user match.

These cases require integration tests and review against the actual Supabase Auth configuration before implementation is considered safe.

## Implementation and validation gates
- Confirm Resend sender configuration and required environment variables without exposing secrets.
- Review Supabase Admin APIs for safely creating or confirming identities after proof of email ownership.
- Build token-hash storage/consumption and safe verification RPCs.
- Add tests for invalid token, expired request/token, replay, cross-device, email mismatch, existing confirmed user, existing unconfirmed user, account mismatch, concurrent activation, finalization rollback, and resend rate limits.
- Run typecheck, lint, test suite, and production build where available; inspect actual CI results.
- Review migration chain and SQL constraints before considering release-ready.

## Release boundary
This design document is branch-only. Do not apply migrations to production, merge PR, or deploy without explicit approval.
## Auth/session decision after API review

Supabase Auth Admin can confirm an exact user email via `updateUserById(..., { email_confirm: true })`, but this administrative confirmation is not itself a user session. Treating email proof as an automatic login to an existing account is not safe.

Recommended direction for implementation:
- Use a PULSE-owned email verification token as proof of email control, with hashed storage, expiry, single-use consumption, and request/email/card binding.
- After proof, create or confirm the Auth identity only for a new activation identity, and do not automatically sign into or modify an existing confirmed identity.
- For an existing confirmed identity, route the user to normal sign-in and provide a safe activation-resume path tied to the verified request; the final binding must require the authenticated user's exact email and ID.
- For a new identity, create/confirm it only after token proof, then use a separate normal sign-in/session-establishment step. Do not assume Admin API confirmation returns a session.
- Keep email verification and card finalization distinct: verification is one-time; finalization remains an atomic RPC that re-checks request expiry/state, card ownership/credential, email, Auth ID, account state, and slug.
- Do not implement the Resend sender until sender-domain/configuration is confirmed. The branch must not depend on production secrets being available during static validation.

This decision avoids the current ephemeral PKCE verifier issue and avoids turning a custom verification token into a login token for an existing account. It is a design recommendation, not yet implementation or integration-test proof.

## Branch implementation audit — 22 November 2026

The latest branch code is not yet aligned with the proposed token design. Confirmed findings:

- `app/api/activate/route.ts` creates an unconfirmed Supabase Auth user **before** email proof. This contradicts the identity-handling decision above; the new-user creation must move behind successful PULSE-token validation.
- The endpoint sends Supabase `signInWithOtp` using a server-created client with `persistSession: false`. No PKCE verifier is persisted by that temporary client, so the cross-device callback redemption is not a reliable activation foundation.
- The callback still exchanges a Supabase Auth code and then finalizes card activation. This is the current OTP-based architecture, not the dedicated PULSE-token verification route.
- The callback accepts a request ID in the query string and a same-device cookie fallback. The request ID is not email ownership proof; the finalization RPC's verified-email check is a necessary downstream guard but does not solve the above flow issues.
- Existing users are not explicitly separated into confirmed, unconfirmed, and mismatch cases in the activation endpoint; the broad “already registered/exist” message handling should not be retained in the replacement flow.

**Disposition:** PR #64 remains draft and must not be merged. The next implementation should replace the current OTP/temporary-client path with the dedicated PULSE token design. Before writing that replacement, the exact token-consumption transaction and existing-user activation-resume path need to be designed so verification cannot be replayed and an existing account cannot be silently bound or logged into.
