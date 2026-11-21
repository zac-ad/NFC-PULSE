# Email-verified card activation — implementation checkpoint

## Branch
`security/email-verification-activation`

## Database groundwork
Migration `20261121090000_email_verified_activation_requests.sql` adds a server-only `activation_requests` table. It stores normalized activation details, the activation-secret hash, request state, expiry, and the verified Auth user ID. It does not activate cards or create profiles.

## Required follow-up before this can be considered implemented
- Replace `POST /api/activate` with request creation only; verify the card and activation credential without claiming it.
- Create a short-lived, random activation-request browser binding in a Secure, HttpOnly, SameSite cookie. Never place activation credentials or bearer request tokens in URLs.
- Send Supabase email-verification OTP/link for the supplied address, with a callback that exchanges the code and checks the server-side Auth user email and `email_confirmed_at`.
- Callback must only finalize a request that matches the cookie-bound request ID, is unexpired, and has the same normalized email.
- Implement a single SECURITY DEFINER finalization RPC with an empty search_path and service_role-only execution. Lock the activation request and hardware card. Re-check request status/expiry, card is UNCLAIMED, card activation-secret hash matches the request, Auth identity is verified, account is ACTIVE, Auth ID is not bound to another account, and slug ownership is valid.
- In that same transaction, create/bind account and profile, bind card, consume card activation credential, and mark request COMPLETED. Late failures must raise so PostgreSQL rolls back; do not return an error JSON after partial writes.
- Idempotency: repeated finalization for the same completed request returns its stored success result; it must not create duplicate profile/card bindings.
- Clean expired requests safely; expiry must not affect claimed cards.
- Existing verified account and existing unverified account flows must both be tested. Never auto-confirm users.
- Generic client responses must avoid card/account enumeration.

## Validation gate
- Migration-chain review and local/test database apply only.
- API and callback tests: invalid card/secret, slug collision, expired request, request-cookie mismatch, unverified email, email mismatch, account DELETING, Auth ID already bound, concurrent claim, callback replay, lost-response retry, and rollback after late failure.
- Integration test against PostgreSQL with realistic schema/fixtures.
- Typecheck, lint, tests, production build, then PR review.
- Do not apply this migration to Supabase production or deploy until release approval.

## Current scope
This branch contains only the database table groundwork. The activation API, callback, finalization RPC, UI, and tests are not yet changed. The migration is intentionally not production-ready on its own.
