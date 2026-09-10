import { createHmac, timingSafeEqual } from 'crypto';
export const COOKIE_NAME = 'pulse_org_session';
function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set.');
  return s;
}
function sign(orgId: string): string {
  return createHmac('sha256', getSecret()).update(orgId).digest('hex');
}
export function createOrgSessionCookieValue(orgId: string): string {
  return `${orgId}.${sign(orgId)}`;
}
export function verifyOrgSessionCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const [orgId, signature] = value.split('.');
  if (!orgId || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(orgId));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return orgId;
}
