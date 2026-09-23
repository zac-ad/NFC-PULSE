// lib/orgSession.ts
// Enterprise org session signing — uses a dedicated ORG_SESSION_SECRET.
// Sessions carry their own expiry so a stolen cookie cannot remain valid
// beyond the intended session lifetime.
import { createHmac, timingSafeEqual } from 'crypto';

export const COOKIE_NAME = '__Host-pulse_org_session';
export const ORG_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ORG_SESSION_SECRET;
  if (!secret) throw new Error('ORG_SESSION_SECRET is not set.');
  return secret;
}

function sign(orgId: string, expiresAt: number): string {
  return createHmac('sha256', getSecret())
    .update(`${orgId}.${expiresAt}`)
    .digest('hex');
}

export function createOrgSessionCookieValue(
  orgId: string,
  now = Date.now()
): string {
  const expiresAt = now + ORG_SESSION_DURATION_MS;
  return `${orgId}.${expiresAt}.${sign(orgId, expiresAt)}`;
}

export function verifyOrgSessionCookieValue(
  value: string | undefined,
  now = Date.now()
): string | null {
  if (!value) return null;

  const parts = value.split('.');
  if (parts.length !== 3) return null;

  const [orgId, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);

  if (
    !orgId ||
    !signature ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now
  ) {
    return null;
  }

  const expected = sign(orgId, expiresAt);
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');

  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return orgId;
}
