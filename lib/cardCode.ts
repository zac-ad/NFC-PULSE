import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_BYTES = 16;
const CODE_LENGTH = 26;

export function generateCardCode(): string {
  const bytes = randomBytes(CODE_BYTES);
  let value = '';

  for (let i = 0; value.length < CODE_LENGTH; i += 1) {
    value += ALPHABET[bytes[i % bytes.length] % ALPHABET.length];
  }

  return `PULSE-${value.slice(0, 13)}-${value.slice(13)}`;
}
