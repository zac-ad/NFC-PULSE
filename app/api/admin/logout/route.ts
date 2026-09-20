// app/api/admin/logout/route.ts
// Revokes the server-side session and clears the cookie.
// Without this, closing the browser doesn't invalidate the session —
// the httpOnly cookie persists until maxAge expires.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeAdminSession, getAdminCookieName, adminCookieOptions } from '@/lib/adminAuth';

export async function POST() {
  const cookieStore = await cookies();
  const cookieName  = getAdminCookieName();
  const sessionId   = cookieStore.get(cookieName)?.value;

  // Revoke server-side even if cookie looks odd — belt and suspenders
  if (sessionId) {
    await revokeAdminSession(sessionId);
  }

  // Clear the cookie by setting maxAge to 0
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookieName, '', adminCookieOptions(0));
  return response;
}
