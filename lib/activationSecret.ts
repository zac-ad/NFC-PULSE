import { randomBytes, createHash } from 'crypto';

const SECRET_BYTES = 32;

export function generateActivationSecret(): string {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

export function hashActivationSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}
