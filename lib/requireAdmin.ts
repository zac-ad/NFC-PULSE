// lib/requireAdmin.ts
//
// Single authoritative admin auth+authz check used by every /api/admin/* route.
//
// Performs both:
//   Authentication — is this a valid, non-expired, non-revoked session?
//   Authorization  — is the request coming from an expected origin?
//
// Usage:
//   const check = await requireAdmin(request);
//   if (!check.ok) return check.response;
//   // proceed with admin action

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyAdminSession, getAdminCookieName, AdminSession } from './adminAuth';

export interface AdminCheck {
  ok: true;
  session: AdminSession;
}
export interface AdminCheckFailed {
  ok: false;
  response: NextResponse;
}

// Origins that are allowed to make admin API requests.
// In production this is your Vercel domain. In dev it's localhost.
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = [
    process.env.NEXT_PUBLIC_SITE_URL,
    'https://nfc-pulse-wine.vercel.app',
    // Add preview URLs here if needed
  ].filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    allowed.push('http://localhost:3000');
  }

  return allowed.some(a => origin === a || origin.startsWith(a as string));
}

export async function requireAdmin(
  request: Request,
  options?: { skipOriginCheck?: boolean }
): Promise<AdminCheck | AdminCheckFailed> {
  const fail = (msg = 'Unauthorized') =>
    ({ ok: false as const, response: NextResponse.json({ error: msg }, { status: 401 }) });

  // ── 1. Origin check (CSRF protection) ─────────────────────────────────────
  // Applies to state-changing methods. GET requests don't need it because
  // they don't mutate data, and CSRF attacks use state-changing requests.
  const method = request.method.toUpperCase();
  if (!options?.skipOriginCheck && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const headerStore = await headers();
    const origin = headerStore.get('origin');
    if (!isAllowedOrigin(origin)) {
      console.warn('[requireAdmin] Origin check failed:', origin);
      return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
  }

  // ── 2. Session cookie ──────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const cookieName  = getAdminCookieName();
  const sessionId   = cookieStore.get(cookieName)?.value;

  if (!sessionId) return fail();

  // ── 3. Full DB session verification ───────────────────────────────────────
  // Checks: exists, not revoked, not expired.
  const session = await verifyAdminSession(sessionId);
  if (!session) return fail();

  return { ok: true, session };
}
