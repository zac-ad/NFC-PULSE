// app/api/activate/route.ts
//
// Activation API — validates the card, prepares its Supabase Auth identity,
// then calls public.activate_card_v2 for the atomic PostgreSQL account/profile/card
// writes. Auth and PostgreSQL cannot share a transaction, so an ambiguous failure
// may leave an Auth identity behind; we retain it for safe retries rather than
// risk deleting an identity another concurrent activation has already bound.
// The account/Auth lifecycle function is defined in
// supabase/migrations/20261002071402_account_auth_lifecycle.sql.
//
// This route only handles:
//   - Input sanitisation before passing to the function
//   - Rate limiting (checked here, not inside SQL)
//   - HTTP response shaping

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { hashActivationSecret } from '@/lib/activationSecret';

type AuthUserResult =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; error: string };

async function ensureAuthUser(email: string): Promise<AuthUserResult> {
  const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!createError && createdData.user) {
    return { ok: true, userId: createdData.user.id, created: true };
  }

  if (!createError || !/already registered|already exists|user already/i.test(createError.message)) {
    console.error('Auth user creation failed:', createError?.message || 'No user returned');
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  // Page through Auth users rather than silently limiting lookup to the first 1,000.
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error('Auth user lookup failed:', error.message);
      return { ok: false, error: 'Could not prepare your login account. Please try again.' };
    }

    const existing = data.users.find(user => user.email?.trim().toLowerCase() === email);
    if (existing) {
      if (!existing.email_confirmed_at) {
        const { data: confirmed, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          existing.id,
          { email_confirm: true }
        );
        if (confirmError || !confirmed.user) {
          console.error('Auth user confirmation failed:', confirmError?.message || 'No user returned');
          return { ok: false, error: 'Could not prepare your login account. Please try again.' };
        }
      }
      return { ok: true, userId: existing.id, created: false };
    }

    if (data.users.length < 1000) break;
  }

  console.error('Auth user exists error but matching user was not found after paginated lookup.');
  return { ok: false, error: 'Could not prepare your login account. Please try again.' };
}

export async function POST(request: Request) {

  // Rate limit: 5 activation attempts per IP per 10 minutes.
  // This is deliberately tighter than the tap-route limiter because
  // activation reveals card states (404 vs 409) which could be used
  // to enumerate valid card codes.
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`activation:${ip}`, 5, 600);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { cardCode, activationSecret, fullName, email, slug, profileType, consent } = body;

  // Basic presence checks before hitting the database
  if (!cardCode || !activationSecret || !fullName || !email || !slug || !profileType) {
    return NextResponse.json({ error: 'Please fill in all fields.' }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json(
      { error: 'Please agree to the Terms and Privacy Policy to continue.' },
      { status: 400 }
    );
  }

  // Sanitise inputs before passing to the SQL function.
  // The function also validates, but doing it here means we catch
  // obvious bad input without a round-trip to the database.
  const cleanCode  = String(cardCode).trim().toUpperCase();
  const cleanSecret = String(activationSecret).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName  = String(fullName).trim();
  const cleanSlug  = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
  const cleanType  = String(profileType).toUpperCase();

  // Reject whitespace-only names before preflight or any Auth identity mutation.
  if (!cleanName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleanSlug)) {
    return NextResponse.json(
      { error: 'PULSE link can only contain lowercase letters, numbers, and hyphens.' },
      { status: 400 }
    );
  }
  if (cleanType !== 'PROFESSIONAL' && cleanType !== 'PERSONAL') {
    return NextResponse.json({ error: 'Invalid profile type.' }, { status: 400 });
  }

  // Validate the card credential before creating or confirming any Auth identity.
  // The final activation RPC revalidates everything transactionally to handle races.
  const { data: preflightData, error: preflightError } = await supabaseAdmin.rpc('validate_card_activation_v1', {
    p_card_code: cleanCode,
    p_activation_secret_hash: hashActivationSecret(cleanSecret),
    p_email: cleanEmail,
    p_slug: cleanSlug,
    p_profile_type: cleanType,
  });
  if (preflightError) {
    console.error('Card activation preflight failed:', preflightError.message);
    return NextResponse.json(
      { error: 'Could not validate this card. Please try again.' },
      { status: 503 }
    );
  }

  const preflight = preflightData as { success?: boolean; error?: string };
  if (!preflight || preflight.error || !preflight.success) {
    const message = preflight?.error || 'Card activation could not be validated. Please try again.';
    const status =
      message.includes("couldn't find that card") ? 404 :
      message.includes('already been activated or is no longer available') ? 409 :
      message.includes('activation secret') ? 403 :
      message.includes('already taken') ||
      message.includes('still being removed') ||
      message.includes('already connected to another login identity') ? 409 :
      400;
    return NextResponse.json({ error: message }, { status });
  }

  // Prepare the Auth identity first, then bind that exact identity and the card
  // in the same database transaction through activate_card_v2.
  const authResult = await ensureAuthUser(cleanEmail);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: 503 });
  }

  const { data, error: rpcError } = await supabaseAdmin.rpc('activate_card_v2', {
    p_card_code: cleanCode,
    p_activation_secret_hash: hashActivationSecret(cleanSecret),
    p_email: cleanEmail,
    p_full_name: cleanName,
    p_slug: cleanSlug,
    p_profile_type: cleanType,
    p_auth_user_id: authResult.userId,
  });

  if (rpcError) {
    // Do not delete a newly created Auth identity on transport failure: the
    // database transaction may have committed even if the response was lost.
    // A retry can safely reuse the identity and reconcile the account.
    console.error('activate_card_v2 RPC error:', rpcError.message);
    return NextResponse.json(
      { error: 'Could not complete activation. Please try again.' },
      { status: 503 }
    );
  }

  const result = data as { success?: boolean; error?: string; slug?: string };
  if (!result || result.error || !result.success) {
    const message = result?.error || 'Activation could not be completed. Please try again.';
    const status =
      message.includes('already been activated') ? 409 :
      message.includes('activation secret') ? 403 :
      message.includes('PULSE link is already taken') || message.includes('already connected') ? 409 :
      message.includes("couldn't find that card") ? 404 :
      message.includes('being activated right now') ? 409 :
      message.includes('still being removed') ? 409 :
      400;

    // Keep the Auth identity on logical activation failures too. Another
    // concurrent request may already be using this identity; deleting it here
    // can trigger accounts.auth_user_id ON DELETE SET NULL after that request
    // has successfully bound the account. The next retry reuses this identity.
    // Orphan cleanup must be a separate, age-gated reconciliation process.
    if (authResult.created) {
      console.warn('Activation did not complete; retaining the Auth identity for a safe retry.');
    }

    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ success: true, slug: result.slug });
}
