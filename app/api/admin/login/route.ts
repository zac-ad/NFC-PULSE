// app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import {
  verifyAdminPassphrase,
  createAdminSession,
  getAdminCookieName,
  adminCookieOptions,
  SESSION_DURATION_MS,
} from '@/lib/adminAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Re-export SESSION_DURATION_MS isn't directly accessible from adminAuth
// because it's not exported — derive maxAge from the cookie duration.
const MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours, matches SESSION_DURATION_MS

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per IP per 15 minutes
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`admin_login:${ip}`, 5, 900);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const { passphrase } = await request.json();

    // Timing-safe passphrase comparison
    if (!verifyAdminPassphrase(passphrase || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create server-side session record
    const userAgent = request.headers.get('user-agent') || '';
    const sessionId = await createAdminSession(ip, userAgent);
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Could not create session. Please try again.' },
        { status: 500 }
      );
    }

    // Set session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set(
      getAdminCookieName(),
      sessionId,
      adminCookieOptions(MAX_AGE_SECONDS)
    );
    return response;

  } catch (err) {
    console.error('[admin/login]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
