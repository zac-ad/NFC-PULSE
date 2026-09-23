// lib/requireAdmin.ts
//
// Single authoritative admin authentication + authorization check used by
// every /api/admin/* route.

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

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const allowed = [
    process.env.NEXT_PUBLIC_SITE_URL,
    'https://nfc-pulse-wine.vercel.app',
  ].filter((value): value is string => Boolean(value));

  if (process.env.NODE_ENV !== 'production') {
    allowed.push('http://localhost:3000');
  }

  // Compare origins exactly. startsWith() would incorrectly accept
  // lookalike origins such as https://nfc-pulse-wine.vercel.app.attacker.com.
  return allowed.some((allowedOrigin) => origin === allowedOrigin);
}

export async function requireAdmin(
  request: Request,
  options?: { skipOriginCheck?: boolean }
): Promise<AdminCheck | AdminCheckFailed> {
  const fail = (msg = 'Unauthorized') =>
    ({ ok: false as const, response: NextResponse.json({ error: msg }, { status: 401 }) });

  const method = request.method.toUpperCase();

  if (!options?.skipOriginCheck && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const headerStore = await headers();
    const origin = headerStore.get('origin');

    if (!isAllowedOrigin(origin)) {
      console.warn('[requireAdmin] Origin check failed:', origin);
      return {
        ok: false,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getAdminCookieName())?.value;

  if (!sessionId) return fail();

  const session = await verifyAdminSession(sessionId);
  if (!session) return fail();

  return { ok: true, session };
}
