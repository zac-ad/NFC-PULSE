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

## Implementation and validation gates
- Confirm Resend sender configuration and required environment variables without exposing secrets.
- Review Supabase Admin APIs for safely creating or confirming identities after proof of email ownership.
- Build token-hash storage/consumption and safe verification RPCs.
- Add tests for invalid token, expired request/token, replay, cross-device, email mismatch, existing confirmed user, existing unconfirmed user, account mismatch, concurrent activation, finalization rollback, and resend rate limits.
- Run typecheck, lint, test suite, and production build where available; inspect actual CI results.
- Review migration chain and SQL constraints before considering release-ready.

## Release boundary
This design document is branch-only. Do not apply migrations to production, merge PR, or deploy without explicit approval.
