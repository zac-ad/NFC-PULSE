import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signAdminSession } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
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
