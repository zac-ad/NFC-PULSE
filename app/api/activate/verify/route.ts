import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { hashActivationVerificationToken, isActivationVerificationTokenShape } from '@/lib/activationVerificationToken';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`activation-verify:${ip}`, 10, 600))) {
    return NextResponse.json({ error: 'Too many verification attempts. Please wait and try again.' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }

  let body: { token?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  if (!isActivationVerificationTokenShape(token)) {
    return NextResponse.json({ error: 'Verification link is invalid or expired.' }, { status: 400, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }

  const { data, error } = await supabaseAdmin.rpc('consume_activation_verification_token', {
    p_token_hash: hashActivationVerificationToken(token),
  });
  if (error) {
    console.error('Activation verification consume failed:', error.message);
    return NextResponse.json({ error: 'Unable to verify at this time. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }

  const result = data as { success?: boolean; request_id?: string; error?: string } | null;
  if (!result?.success || !result.request_id) {
    return NextResponse.json({ error: result?.error || 'Verification link is invalid or expired.' }, { status: 400, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }
  return NextResponse.json({ success: true, request_id: result.request_id }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
