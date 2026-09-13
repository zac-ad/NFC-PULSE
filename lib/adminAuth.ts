import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set.');
  return secret;
}

export function signAdminSession(): string {
  const payload = 'admin_auth_granted';
  const hmac = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

export function verifyAdminSession(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  if (payload !== 'admin_auth_granted') return false;
  try {
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch { return false; }
}
