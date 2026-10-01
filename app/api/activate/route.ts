// app/api/activate/route.ts
//
// Activation API — calls the activate_card() Postgres function which
// performs all writes (account, profile, card binding) in one atomic
// transaction. If anything fails mid-way, Postgres rolls everything
// back. No partial state, no orphaned accounts.
//
// The actual business logic lives in:
//   supabase/migrations/0003_atomic_activation.sql
//
// This route only handles:
//   - Input sanitisation before passing to the function
//   - Rate limiting (checked here, not inside SQL)
//   - HTTP response shaping

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { hashActivationSecret } from '@/lib/activationSecret';

async function ensureAuthUser(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!createError) return { ok: true };

  // A retry or an already-existing PULSE account should not fail activation.
  // Only fall back to lookup for the expected duplicate-user condition.
  const duplicate = /already registered|already exists|user already/i.test(createError.message);
  if (!duplicate) {
    console.error('Auth user creation failed:', createError.message);
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error('Auth user lookup failed:', listError.message);
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  const existingUser = usersData.users.find(
    user => user.email?.trim().toLowerCase() === email
  );

  if (!existingUser) {
    console.error('Auth user exists error but matching user was not found.');
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  if (existingUser.email_confirmed_at) return { ok: true };

  const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
    existingUser.id,
    { email_confirm: true }
  );

  if (confirmError) {
    console.error('Auth user confirmation failed:', confirmError.message);
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  return { ok: true };
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

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleanSlug)) {
    return NextResponse.json(
      { error: 'PULSE link can only contain lowercase letters, numbers, and hyphens.' },
      { status: 400 }
    );
  }
  if (cleanType !== 'PROFESSIONAL' && cleanType !== 'PERSONAL') {
    return NextResponse.json({ error: 'Invalid profile type.' }, { status: 400 });
  }

  // Call the atomic Postgres function.
  // activate_card() always returns a JSON object with either:
  //   { success: true, slug, profile_id, account_id }
  //   { error: "human readable message" }
  //
  // It never throws — all exceptions are caught inside the function
  // and returned as { error: "..." } — so we only need to handle the
  // case where the RPC call itself fails (network, Supabase outage).
  const { data, error: rpcError } = await supabaseAdmin.rpc('activate_card', {
    p_card_code:    cleanCode,
    p_activation_secret_hash: hashActivationSecret(cleanSecret),
    p_email:        cleanEmail,
    p_full_name:    cleanName,
    p_slug:         cleanSlug,
    p_profile_type: cleanType,
  });

  if (rpcError) {
    // RPC transport failure — the function didn't run at all.
    console.error('activate_card RPC error:', rpcError.message);
    return NextResponse.json(
      { error: 'Could not reach the database. Please try again.' },
      { status: 503 }
    );
  }

  // The function ran — check its returned JSON for success or error.
  const result = data as { success?: boolean; error?: string; slug?: string };

  if (result.error) {
    // Determine the right HTTP status from the error content.
    const status =
      result.error.includes('already been activated') ? 409 :
      result.error.includes('activation secret') ? 403 :
      result.error.includes('PULSE link is already taken') ? 409 :
      result.error.includes('couldn\'t find that card') ? 404 :
      result.error.includes('being activated right now') ? 409 :
      400;

    return NextResponse.json({ error: result.error }, { status });
  }

  // Activation creates the PULSE account/profile in Postgres. Supabase Auth is
  // kept separate, so create and auto-confirm the passwordless login identity
  // before sending the sign-in link from the activation page.
  const authResult = await ensureAuthUser(cleanEmail);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: 503 });
  }

  return NextResponse.json({ success: true, slug: result.slug });
}
