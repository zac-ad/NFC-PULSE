// Email-verified activation request endpoint. Cards remain unclaimed until callback/token finalization.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { hashActivationSecret } from '@/lib/activationSecret';
import { issueVerificationToken } from '@/lib/activationVerification';
import { sendActivationVerificationEmail } from '@/lib/email/activationEmail';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`activation-request:${ip}`, 5, 600))) {
    return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { cardCode, activationSecret, fullName, email, slug, profileType, consent } = body;
  if (!cardCode || !activationSecret || !fullName || !email || !slug || !profileType || !consent) {
    return NextResponse.json({ error: 'Please fill in all fields and accept the terms.' }, { status: 400 });
  }

  const cleanCode = String(cardCode).trim().toUpperCase();
  const cleanSecret = String(activationSecret).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(fullName).trim();
  const cleanSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
  const cleanType = String(profileType).toUpperCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254 ||
      cleanName.length < 2 || cleanName.length > 120 || cleanSlug.length < 2 || cleanSlug.length > 50 ||
      !SLUG_RE.test(cleanSlug) || (cleanType !== 'PROFESSIONAL' && cleanType !== 'PERSONAL') ||
      cleanCode.length > 64 || cleanSecret.length < 20 || cleanSecret.length > 200) {
    return NextResponse.json({ error: 'Please check the activation details and try again.' }, { status: 400 });
  }

  const { data: requestData, error: requestError } = await supabaseAdmin.rpc('create_activation_request', {
    p_card_code: cleanCode,
    p_activation_secret_hash: hashActivationSecret(cleanSecret),
    p_email: cleanEmail,
    p_full_name: cleanName,
    p_slug: cleanSlug,
    p_profile_type: cleanType,
  });

  if (requestError) {
    console.error('Activation request RPC failed:', requestError.message);
    return NextResponse.json({ error: 'Could not start activation. Please try again.' }, { status: 503 });
  }
  const requestResult = requestData as { success?: boolean; request_id?: string; error?: string };
  if (!requestResult?.success || !requestResult.request_id) {
    return NextResponse.json({ error: requestResult?.error || 'Card could not be verified.' }, { status: 400 });
  }

  // Issue high-entropy single-use verification token (persists only SHA-256 hash)
  const tokenResult = await issueVerificationToken(requestResult.request_id);
  if (!tokenResult.success || !tokenResult.token) {
    console.error('Failed to issue activation verification token:', tokenResult.error);
    return NextResponse.json({ error: 'Could not generate verification email. Please try again.' }, { status: 503 });
  }

  // Construct dedicated PULSE verification URL
  const host = request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const origin = `${proto}://${host}`;
  const verificationUrl = `${origin}/activate/verify?token=${encodeURIComponent(tokenResult.token)}`;

  // Send activation verification email through provider abstraction
  const emailResult = await sendActivationVerificationEmail({
    to: cleanEmail,
    fullName: cleanName,
    verificationUrl,
    expiresInMinutes: 30,
  });

  if (!emailResult.success) {
    console.error('Activation verification email send failed:', emailResult.error);
    return NextResponse.json({ error: 'Could not send verification email. Please try again.' }, { status: 503 });
  }

  const response = NextResponse.json({
    success: true,
    message: 'Check your email to verify and finish activation.',
    requestId: requestResult.request_id,
  });

  // Bind pending request id in HttpOnly cookie for session association
  response.cookies.set('pulse_activation_request', requestResult.request_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  });

  return response;
}
