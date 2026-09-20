// middleware.ts
//
// Edge-level protection for all /admin routes.
//
// This runs BEFORE any route handler on every request to /admin/* and
// /api/admin/*. A miscoded handler, a forgotten auth check, or a new
// route added without a requireAdmin() call cannot bypass this gate.
//
// Note: middleware runs on the Vercel Edge Runtime which does not support
// Node.js crypto APIs or Supabase client connections. So we cannot do a
// full session DB lookup here. What we CAN do:
//
//   1. Reject requests with no session cookie at all — zero DB cost
//   2. Reject session IDs that are obviously malformed
//   3. Let the route handler do the full DB verification
//
// This is defense-in-depth: the middleware catches the easy cases fast,
// and the route-level requireAdmin() does the authoritative check.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_COOKIE_PROD = '__Host-admin_session';
const ADMIN_COOKIE_DEV  = 'admin_session_dev';
const SESSION_ID_LENGTH = 64; // 32 bytes hex

function getSessionId(request: NextRequest): string | undefined {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieName = isProd ? ADMIN_COOKIE_PROD : ADMIN_COOKIE_DEV;
  return request.cookies.get(cookieName)?.value;
}

function isValidSessionIdFormat(id: string): boolean {
  // 64 hex chars, nothing else
  return /^[0-9a-f]{64}$/.test(id) && id.length === SESSION_ID_LENGTH;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin route protection ─────────────────────────────────────────────────
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi  = pathname.startsWith('/api/admin');

  if (isAdminPage || isAdminApi) {
    // Allow the login page and login API through without a session
    const isLoginPage = pathname === '/admin/login';
    const isLoginApi  = pathname === '/api/admin/login';

    if (!isLoginPage && !isLoginApi) {
      const sessionId = getSessionId(request);

      // No cookie at all → redirect pages to login, return 401 for API
      if (!sessionId) {
        if (isAdminApi) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Cookie present but obviously malformed → reject immediately
      if (!isValidSessionIdFormat(sessionId)) {
        const response = isAdminApi
          ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          : NextResponse.redirect(new URL('/admin/login', request.url));
        // Clear the malformed cookie
        response.cookies.set(
          process.env.NODE_ENV === 'production' ? ADMIN_COOKIE_PROD : ADMIN_COOKIE_DEV,
          '',
          { maxAge: 0, path: '/' }
        );
        return response;
      }

      // Format is valid — let the route handler do the full DB check.
      // We add a header so route handlers know middleware passed format check.
      const response = NextResponse.next();
      response.headers.set('x-admin-session-id', sessionId);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
