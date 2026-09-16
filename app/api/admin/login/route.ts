import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signAdminSession } from '@/lib/adminAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    // 5 attempts per 15 minutes per IP — enough for genuine typos,
    // not enough to brute-force a passphrase.
    const allowed = await checkRateLimit(`admin_login:${ip}`, 5, 900);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const { passphrase } = await request.json();
    const validPassphrase = process.env.ADMIN_PASSPHRASE;
    if (!validPassphrase || passphrase !== validPassphrase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = signAdminSession();
    const cookieStore = await cookies();
    cookieStore.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
