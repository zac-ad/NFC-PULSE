# PULSE — Current Status

Updated: 2026-11-22

## Done
- Email-verified activation groundwork is present on PR #64 branch `security/email-verification-activation`.
- Fixed the duplicate activation request identifier compile error (commit `07a4edaaf90e30b64fe4145a24804a85d2d897b3`).
- Vercel preview for that exact commit reached `READY`; GitHub commit status reports Vercel success.
- Branch documentation records the architecture review, design decision, token lifecycle, and required test matrix.
- The user approved proceeding with the PULSE-owned token-verification design in chat on 2026-11-22. Approval is for branch implementation and validation only; it does not approve production migration, merge, or release.

## In progress
- PR #64 remains OPEN and DRAFT. No merge.
- Replace the current Supabase OTP / ephemeral-client activation path with a PULSE-owned email verification token flow.
- Separate email proof from Auth identity creation/confirmation, sign-in, and authenticated activation resume.
- Implement request/token state transitions and atomic, replay-safe token consumption.
- Implement authenticated resume/finalization with exact normalized-email and account-binding checks.

## Decisions / boundaries
- Email proof is not a login credential and must not automatically create a session.
- Request ID alone is not proof of email ownership.
- Raw verification tokens must never be persisted or logged; persist only hashes.
- Verification tokens are single-use, expiry-bound, request-bound, and invalidated on resend/replacement.
- Email delivery is outside SQL transactions and must have safe retry/recovery behavior.
- No production migration, production Auth changes, merge, or production deployment without explicit approval.

## Unverified / next
- The Vercel build passed for commit `07a4edaaf90e30b64fe4145a24804a85d2d897b3`; this was before the token redesign.
- Token architecture implementation has not started.
- Current execution environment exposes GitHub file/commit operations but no local repository shell. I checked common GitHub Actions workflow paths and found no CI workflow configured. Mandatory local typecheck/lint/test/build gates cannot be run before a branch commit, and no CI substitute is currently available. Do not commit implementation until a validation environment or approved equivalent gate is available.
- No test suite, typecheck, lint, SQL migration validation, token lifecycle tests, Auth identity-case tests, concurrency/replay tests, or real email configuration checks have been verified.
- Resend sender/domain configuration is not confirmed. Do not implement delivery as if configuration is available; design a provider abstraction and require env/config verification before live sending.

## Lessons
- A successful build only confirms compilation/deployment output; it does not establish safe activation behavior.
- For email verification, review cross-device token handling, identity side effects, replay, and resume behavior before relying on Auth callback flows.
- Do not treat unavailable local validation as a reason to bypass the pre-push gate; stop before implementation commits if required validation cannot be run.
