// lib/adminAuth.ts
//
// Admin authentication and server-side session management.

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export const ADMIN_COOKIE_NAME = '__Host-admin_session';
export const ADMIN_COOKIE_NAME_DEV = 'admin_session_dev';

export function getAdminCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? ADMIN_COOKIE_NAME
    : ADMIN_COOKIE_NAME_DEV;
}

function getAdminSecret(): string {
  // Admin sessions must use their own secret. Do not silently reuse
  // another authentication secret in production.
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set.');
  return secret;
}

export function verifyAdminPassphrase(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSPHRASE;
  if (!expected) return false;

  try {
    const secret = getAdminSecret();
    const a = createHmac('sha256', secret).update(submitted).digest();
    const b = createHmac('sha256', secret).update(expected).digest();
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function createAdminSession(
  ip: string,
  userAgent: string
): Promise<string | null> {
  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const { error } = await supabaseAdmin.from('admin_sessions').insert({
    session_id: sessionId,
    expires_at: expiresAt,
    ip: ip || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error('[adminAuth] Failed to create session:', error.message);
    return null;
  }

  return sessionId;
}

export interface AdminSession {
  id: string;
  session_id: string;
  expires_at: string;
  ip: string | null;
}

export async function verifyAdminSession(
  sessionId: string | undefined
): Promise<AdminSession | null> {
  if (!sessionId || sessionId.length !== 64 || !/^[0-9a-f]+$/i.test(sessionId)) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('admin_sessions')
    .select('id, session_id, expires_at, ip')
    .eq('session_id', sessionId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('[adminAuth] Session lookup error:', error.message);
    return null;
  }

  return data || null;
}

export async function revokeAdminSession(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from('admin_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('session_id', sessionId);
}

export function adminCookieOptions(maxAge: number) {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
