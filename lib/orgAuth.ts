import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
const KEY_LENGTH = 64;
export function hashAccessCode(code: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(code, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyAccessCode(code: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(code, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
