# Activation Verification — Test Matrix

Branch: `security/email-verification-activation`

This matrix defines validation expected for the redesigned activation flow. It is not a claim that these tests currently exist or have passed.

## Request creation

| Scenario | Expected result |
|---|---|
| Valid card + activation secret + fields | Pending request only; card remains UNCLAIMED |
| Unknown card or wrong secret | Generic rejection; no Auth user created; no card mutation |
| Invalid email, slug, profile type, or consent | Validation rejection |
| Request throttling | 429; no new request |
| Second pending request for same card | Prior pending request safely invalidated; only one usable request remains |
| DB/card lock contention | Retryable generic response; no partial mutation |

## Email proof

| Scenario | Expected result |
|---|---|
| Correct token | Verification succeeds once; token consumed |
| Token invalid / malformed | Generic failure; no identity or card writes |
| Token expired | Expired response; request remains unclaimed |
| Token replay | Rejected; no second finalization |
| Token/request/email binding mismatch | Rejected |
| Cross-device verification | Supported without browser PKCE verifier dependence |
| Concurrent token submissions | Exactly one successful consumption |
| Resend | Rate-limited; prior token invalidated or safely superseded |

## Auth identity

| Scenario | Expected result |
|---|---|
| No Auth identity for verified email | Create/confirm only after token proof; no automatic assumption of session |
| Existing confirmed exact-email identity | No credential change or auto-login; normal sign-in required to resume |
| Existing unconfirmed exact-email identity | Confirm only after proof for that exact identity; no password/metadata edits |
| Email mismatch / duplicate / ambiguous identity | Stop; no confirmation or account binding |
| Auth identity already bound to another account | Stop; no card/profile writes |

## Finalization and database invariants

| Scenario | Expected result |
|---|---|
| Valid verified identity + valid request | Account/profile/card finalization is atomic |
| Card already claimed or credential changed | Rejected; no profile/account partial writes |
| Account not ACTIVE | Rejected; no card writes |
| Slug collision | Rejected; no card writes |
| Auth email unverified or does not match request | Rejected |
| Auth ID already bound elsewhere | Rejected |
| Failure after any intermediate write | Transaction rolls back all writes |
| Duplicate finalize call by same identity | Idempotent success, no duplicates |
| Duplicate finalize call by different identity | Rejected |
| Concurrent requests for same card | At most one activation succeeds |

## UX / privacy

| Scenario | Expected result |
|---|---|
| Request accepted | Clear pending-verification message; no claim of card activation |
| Token expired/used | Clear recovery/resend path |
| Unknown card/email/account | Generic response; avoid enumeration |
| Successful activation | Clear success state and dashboard action |
| Verification link | No raw token/request secret in logs; appropriate referrer protections |

## Release validation

- Unit/static tests for token generation, hashing, expiry, and consumption.
- API tests for request and resend throttling, generic errors, and input validation.
- Auth integration tests for all identity cases above.
- Database integration tests for transaction rollback, concurrency, and idempotency.
- Typecheck, lint, complete test suite, and production build.
- CI results reviewed against the final commit.
- Migration reviewed and tested outside production.
- Production mutation, merge, and deploy require explicit approval.
