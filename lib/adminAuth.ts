// lib/adminAuth.ts
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET || '';

export function signAdminSession(): string {
  const payload = 'admin_auth_granted';
  const hmac = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

export function verifyAdminSession(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  
  const [payload, signature] = token.split('.');
  if (payload !== 'admin_auth_granted') return false;

  const expectedHmac = createHmac('sha256', SECRET).update(payload).digest('hex');
  
  const expectedBuffer = Buffer.from(expectedHmac);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}