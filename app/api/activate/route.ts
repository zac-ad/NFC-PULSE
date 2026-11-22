// Email-verified activation request endpoint. Cards remain unclaimed until callback finalization.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { hashActivationSecret } from '@/lib/activationSecret';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`activation-request:${ip}`, 5, 600))) {
    return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
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
  if (!requestResult?.success || !requestData.request_id) {
    return NextResponse.json({ error: requestResult?.error || 'Card could not be verified.' }, { status: 400 });
  }

  // Create an unconfirmed Auth identity if the email is new. Existing identities are retained.
  const { error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
    email_confirm: false,
  });
  if (createUserError && !/already registered|already exists|user already/i.test(createUserError.message)) {
    console.error('Pending Auth user creation failed:', createUserError.message);
    return NextResponse.json({ error: 'Could not send verification email. Please try again.' }, { status: 503 });
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  );
  const redirectTo = new URL('/auth/callback?flow=activation&next=%2Fdashboard', request.url).toString();
  const { error: otpError } = await authClient.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });

  if (otpError) {
    console.error('Activation verification email send failed:', otpError.message);
    return NextResponse.json({ error: 'Could not send verification email. Please try again.' }, { status: 503 });
  }

  const response = NextResponse.json({ success: true, message: 'Check your email to verify and finish activation.' });
  response.cookies.set('pulse_activation_request', requestResult.request_id, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/auth/callback', maxAge: 30 * 60,
  });
  return response;
}
