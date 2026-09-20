// lib/orgSession.ts
// Enterprise org session signing — uses ORG_SESSION_SECRET,
// separate from ADMIN_SESSION_SECRET so one leak can't compromise both.
import { createHmac, timingSafeEqual } from 'crypto';
export const COOKIE_NAME = 'pulse_org_session';

function getSecret(): string {
  const secret = process.env.ORG_SESSION_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error('ORG_SESSION_SECRET is not set.');
  if (!process.env.ORG_SESSION_SECRET) {
    console.warn('[orgSession] ORG_SESSION_SECRET not set — falling back to SESSION_SECRET.');
  }
  return secret;
}
function sign(orgId: string): string {
  return createHmac('sha256', getSecret()).update(orgId).digest('hex');
}
export function createOrgSessionCookieValue(orgId: string): string {
  return `${orgId}.${sign(orgId)}`;
}
export function verifyOrgSessionCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const dotIndex = value.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const orgId     = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  if (!orgId || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(orgId));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return orgId;
}
