import { randomBytes } from 'crypto';

const NFC_PASSWORD_BYTES = 4;

/**
 * NTAG21x PWD is exactly 4 bytes. NFC Tools supports entering these
 * as 4 raw bytes through its Hex Password mode.
 */
export function generateNfcPassword(): string {
  return randomBytes(NFC_PASSWORD_BYTES).toString('hex').toUpperCase();
}
