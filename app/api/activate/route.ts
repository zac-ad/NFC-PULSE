// Email-verified activation request endpoint. Cards remain unclaimed until callback finalization.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { hashActivationSecret } from '@/lib/activationSecret';
import { Resend } from 'resend';
import { createActivationVerificationToken, hashActivationVerificationToken } from '@/lib/activationVerificationToken';

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

  // Validate delivery configuration before creating a pending activation request.
  const appUrl = process.env.PULSE_APP_URL?.trim();
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.PULSE_ACTIVATION_FROM?.trim();
  if (!appUrl || !resendApiKey || !from) {
    console.error('Activation email configuration is incomplete.');
    return NextResponse.json({ error: 'Activation email is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
  let verifyUrl: URL;
  try { verifyUrl = new URL('/activate/verify', appUrl); } catch {
    console.error('Activation email configuration contains an invalid app URL.');
    return NextResponse.json({ error: 'Activation email is temporarily unavailable. Please try again later.' }, { status: 503 });
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

  // Email proof is handled by PULSE-owned opaque tokens; no Auth identity/session is created during request submission.
  const token = createActivationVerificationToken();
  const tokenHash = hashActivationVerificationToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data: issueData, error: issueError } = await supabaseAdmin.rpc('issue_activation_verification_token', {
    p_request_id: requestResult.request_id,
    p_token_hash: tokenHash,
    p_token_expiry: expiresAt,
  });
  const issueResult = issueData as { success?: boolean; error?: string } | null;
  if (issueError || !issueResult?.success) {
    console.error('Activation verification token issuance failed:', issueError?.message || issueResult?.error || 'Unknown error');
    return NextResponse.json({ error: 'Could not start email verification. Please try again.' }, { status: 503 });
  }

  verifyUrl.searchParams.set('token', token);
  const resend = new Resend(resendApiKey);
  const { error: emailError } = await resend.emails.send({
    from,
    to: cleanEmail,
    subject: 'Verify your PULSE card activation',
    text: `Verify your email to continue activating your PULSE card. This link expires in 30 minutes: ${verifyUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Verify your email</h2><p>Use this link to continue activating your PULSE card. It expires in 30 minutes.</p><p><a href="${verifyUrl.toString()}">Verify email and continue</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
  });

  if (emailError) {
    console.error('Activation email delivery failed:', emailError.message);
    // Revoke the token so a failed delivery cannot leave a usable secret behind.
    await supabaseAdmin.from('activation_verification_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('request_id', requestResult.request_id)
      .eq('token_hash', tokenHash)
      .is('consumed_at', null);
    return NextResponse.json({ error: 'Could not send verification email. Please try again.' }, { status: 503 });
  }

  return NextResponse.json({ success: true, message: 'Check your email to verify and continue activating your card.' });
}
