import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { consumeVerificationToken } from '@/lib/activationVerification';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`activation-verify:${ip}`, 10, 600))) {
    return NextResponse.json({ error: 'Too many verification attempts. Please wait.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid verification request.' }, { status: 400 });
  }

  const { token } = body;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid verification token.' }, { status: 400 });
  }

  // Atomically consume token and transition request to EMAIL_VERIFIED
  const consumeResult = await consumeVerificationToken(token);
  if (!consumeResult.success || !consumeResult.requestId || !consumeResult.email) {
    return NextResponse.json(
      { error: consumeResult.error || 'Verification link is invalid or has already been used.' },
      { status: 400 }
    );
  }

  const email = consumeResult.email.toLowerCase().trim();

  // Identity resolution after proof:
  // Check if Auth identity exists for this exact normalized email.
  try {
    const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });

    if (listError) {
      console.error('Failed to query auth users during activation verification:', listError.message);
    } else {
      const existingUser = userData?.users?.find(
        u => u.email?.toLowerCase().trim() === email
      );

      if (!existingUser) {
        // No Auth user exists: create one confirmed as a direct result of token proof
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
        });
        if (createError) {
          console.error('Failed to create confirmed auth user after email verification:', createError.message);
        }
      } else if (!existingUser.email_confirmed_at) {
        // Existing user is unconfirmed: confirm email only
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
        });
        if (updateError) {
          console.error('Failed to confirm existing auth user after email verification:', updateError.message);
        }
      }
      // If user exists and is already confirmed, leave credentials/metadata untouched.
    }
  } catch (identityErr) {
    console.error('Identity resolution error:', identityErr instanceof Error ? identityErr.message : identityErr);
  }

  const response = NextResponse.json({
    success: true,
    requestId: consumeResult.requestId,
    email: consumeResult.email,
    slug: consumeResult.slug,
    profileType: consumeResult.profileType,
  });

  // Bind the verified activation request into an HttpOnly cookie for resume/retry flows
  response.cookies.set('pulse_activation_request', consumeResult.requestId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60, // 30 minutes
  });

  return response;
}
