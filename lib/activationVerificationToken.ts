// Server-only helpers for PULSE activation verification tokens.
import { createHash, randomBytes } from 'node:crypto';

export function createActivationVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashActivationVerificationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isActivationVerificationTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
