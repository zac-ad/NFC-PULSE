# PULSE — Current Status

Updated: 2026-11-22

## Done
- Email-verified activation groundwork is present on PR #64 branch `security/email-verification-activation`.
- Fixed the duplicate activation request identifier compile error (commit `07a4edaaf90e30b64fe4145a24804a85d2d897b3`).
- Vercel preview for that exact commit reached `READY`; GitHub commit status reports Vercel success.
- Branch documentation records an architecture review, design decision, token lifecycle, and test matrix.

## In progress
- PR #64 remains OPEN and DRAFT. No merge.
- Activation architecture review: current Supabase OTP/ephemeral-client implementation is not the approved direction for PULSE-owned email verification.
- Proposed replacement: PULSE-owned, hashed, single-use verification token; explicit request lifecycle; email proof separated from Auth sign-in; authenticated resume/finalization.

## Decisions / boundaries
- Email proof is not a login credential and must not automatically create a session.
- Request ID alone is not proof of email ownership.
- No production migration, production Auth changes, merge, or production deployment without explicit approval.
- The replacement activation verification/auth identity model is a security-model change and requires user approval before implementation.

## Unverified / next
- The Vercel build passed, but the activation flow has not been integration-tested end-to-end.
- No test suite, typecheck, lint, isolated SQL migration validation, token lifecycle tests, Auth identity-case tests, concurrency/replay tests, or real email configuration checks were verified in this session.
- Review and approval of the PULSE-owned token verification and authenticated-resume design is the next blocker.
- STATUS.md did not exist on the branch before this update.

## Lessons
- A successful build only confirms compilation/deployment output; it does not establish safe activation behavior.
- For email verification, review cross-device token handling, identity side effects, replay, and resume behavior before relying on Auth callback flows.
