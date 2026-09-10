import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAccessCode } from '@/lib/orgAuth';
import { createOrgSessionCookieValue, COOKIE_NAME } from '@/lib/orgSession';

export async function POST(request: Request) {
  const { accessCode } = await request.json();
  if (!accessCode) return NextResponse.json({ error: 'Access code required.' }, { status: 400 });

  const { data: orgs, error } = await supabaseAdmin
    .from('organizations').select('id, name, access_code_hash');

  if (error) return NextResponse.json({ error: 'Could not verify.' }, { status: 500 });

  const match = (orgs || []).find((org) => verifyAccessCode(accessCode, org.access_code_hash));
  if (!match) return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 });

  const response = NextResponse.json({ success: true, organizationName: match.name });
  response.cookies.set(COOKIE_NAME, createOrgSessionCookieValue(match.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
