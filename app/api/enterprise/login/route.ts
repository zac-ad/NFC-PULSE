import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAccessCode } from '@/lib/orgAuth';
import {
  createOrgSessionCookieValue,
  COOKIE_NAME,
  ORG_SESSION_DURATION_MS,
} from '@/lib/orgSession';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  // Rate limit: 10 attempts per IP per 15 minutes
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`enterprise-login:${ip}`, 10, 900);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait before trying again.' },
      { status: 429 }
    );
  }

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
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(ORG_SESSION_DURATION_MS / 1000),
  });
  return response;
}
