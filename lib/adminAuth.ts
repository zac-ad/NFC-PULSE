// lib/adminAuth.ts
//
// Admin authentication and session management.
//
// Architecture:
//   LOGIN  → generate random session ID → store in admin_sessions table
//            → set __Host-admin_session cookie containing only the ID
//
//   REQUEST → read session ID from cookie → look up in admin_sessions
//             → reject if not found, expired, or revoked
//
//   LOGOUT → set revoked_at on the session record → clear cookie
//
// Why this is better than the old static HMAC token:
//   The old token was valid for 24h with no revocation path. If stolen,
//   an attacker had a full day of admin access. Now, logout immediately
//   invalidates the session regardless of cookie lifetime.
//
// Secrets:
//   Uses ADMIN_SESSION_SECRET — separate from SESSION_SECRET which is
//   used by enterprise/org sessions. One leaked secret cannot
//   compromise both systems.

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

// Session lifetime: 8 hours. Short enough to limit stolen-session exposure,
// long enough for a normal admin work session.
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Cookie name uses __Host- prefix:
//   - Forces Secure flag (HTTPS only)
//   - Forces path=/ (no subdomain path confusion)
//   - Cannot be set by subdomains
// Note: __Host- cookies cannot have a Domain attribute. The browser
// enforces this. We omit Domain in the Set-Cookie call below.
export const ADMIN_COOKIE_NAME = '__Host-admin_session';

// Fallback for local dev where __Host- requires HTTPS (which localhost
// doesn't have). In development, use a plain cookie name.
export const ADMIN_COOKIE_NAME_DEV = 'admin_session_dev';

export function getAdminCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? ADMIN_COOKIE_NAME
    : ADMIN_COOKIE_NAME_DEV;
}

function getAdminSecret(): string {
  // Separate secret from org/enterprise sessions.
  // Falls back to SESSION_SECRET only if ADMIN_SESSION_SECRET is not set,
  // so existing deployments don't break immediately — but logs a warning.
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set.');
  if (!process.env.ADMIN_SESSION_SECRET) {
    console.warn('[adminAuth] ADMIN_SESSION_SECRET not set — falling back to SESSION_SECRET. Set a dedicated secret.');
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Passphrase verification — timing-safe
// ---------------------------------------------------------------------------

export function verifyAdminPassphrase(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSPHRASE;
  if (!expected) return false;
  try {
    // Hash both with HMAC so they are the same length (timingSafeEqual
    // requires equal-length buffers). Using a fixed key here is fine
    // because this is about timing safety, not cryptographic secrecy —
    // the passphrase itself is the secret.
    const secret = getAdminSecret();
    const a = createHmac('sha256', secret).update(submitted).digest();
    const b = createHmac('sha256', secret).update(expected).digest();
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

export async function createAdminSession(
  ip: string,
  userAgent: string
): Promise<string | null> {
  // 32 random bytes = 256 bits of entropy. Unguessable.
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const { error } = await supabaseAdmin.from('admin_sessions').insert({
    session_id: sessionId,
    expires_at: expiresAt,
    ip:         ip || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error('[adminAuth] Failed to create session:', error.message);
    return null;
  }

  return sessionId;
}

// ---------------------------------------------------------------------------
// Session verification — called on every admin request
// ---------------------------------------------------------------------------

export interface AdminSession {
  id: string;
  session_id: string;
  expires_at: string;
  ip: string | null;
}

export async function verifyAdminSession(
  sessionId: string | undefined
): Promise<AdminSession | null> {
  if (!sessionId || sessionId.length !== 64) return null; // 32 bytes hex = 64 chars

  const { data, error } = await supabaseAdmin
    .from('admin_sessions')
    .select('id, session_id, expires_at, ip')
    .eq('session_id', sessionId)
    .is('revoked_at', null)           // not revoked
    .gt('expires_at', new Date().toISOString()) // not expired
    .maybeSingle();

  if (error) {
    console.error('[adminAuth] Session lookup error:', error.message);
    return null;
  }

  return data || null;
}

// ---------------------------------------------------------------------------
// Session revocation — called on logout
// ---------------------------------------------------------------------------

export async function revokeAdminSession(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from('admin_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('session_id', sessionId);
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function adminCookieOptions(maxAge: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure:   isProd,
    sameSite: 'lax' as const,
    path:     '/',
    maxAge,
    // __Host- cookies must NOT have a Domain attribute
    // (browser enforces this; omitting domain here achieves that)
  };
}
