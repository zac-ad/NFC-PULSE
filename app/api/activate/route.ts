// app/api/activate/route.ts
//
// Activation is deliberately split across Supabase Auth and Postgres.
// Auth is prepared first; the database transaction then binds that exact
// auth_user_id to the PULSE account and claims the card. If the database
// operation fails after a newly-created Auth user was made, we compensate by
// deleting that new Auth user so a failed activation can be retried safely.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { hashActivationSecret } from '@/lib/activationSecret';

type AuthPreparation =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; error: string };

async function findAuthUserByEmail(email: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) return { user: null, error };

    const user = data.users.find(
      candidate => candidate.email?.trim().toLowerCase() === email
    );

    if (user) return { user, error: null };
    if (data.users.length < 1000) break;
  }

  return { user: null, error: null };
}

async function prepareAuthUser(email: string): Promise<AuthPreparation> {
  // Prefer the direct PULSE -> Auth relationship when the account already
  // exists. This avoids scanning Auth users during normal retries.
  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('auth_user_id, deletion_status')
    .eq('email', email)
    .maybeSingle();

  if (accountError) {
    console.error('[activate] account lookup failed:', accountError.message);
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  if (account?.deletion_status === 'DELETING') {
    return { ok: false, error: 'This account is still being removed. Please try again after cleanup is complete.' };
  }

  if (account?.auth_user_id) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(account.auth_user_id);

    if (error || !data.user) {
      console.error('[activate] linked Auth user lookup failed:', error?.message);
      return { ok: false, error: 'Could not prepare your login account. Please contact support.' };
    }

    if (data.user.email?.trim().toLowerCase() !== email) {
      console.error('[activate] linked Auth user email mismatch.');
      return { ok: false, error: 'This email is connected to a different login identity.' };
    }

    if (!data.user.email_confirmed_at) {
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error('[activate] Auth confirmation failed:', confirmError.message);
        return { ok: false, error: 'Could not prepare your login account. Please try again.' };
      }
    }

    return { ok: true, userId: data.user.id, created: false };
  }

  const { data: createdData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

  if (!createError && createdData.user) {
    return { ok: true, userId: createdData.user.id, created: true };
  }

  // The email may already belong to an Auth user created outside PULSE or by
  // an earlier interrupted activation. Resolve it with pagination instead of
  // assuming the first 1,000 users contain the match.
  const duplicate = createError
    ? /already registered|already exists|user already/i.test(createError.message)
    : false;

  if (!duplicate) {
    console.error('[activate] Auth user creation failed:', createError?.message);
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  const { user, error: lookupError } = await findAuthUserByEmail(email);

  if (lookupError || !user) {
    console.error('[activate] Auth user lookup failed:', lookupError?.message);
    return { ok: false, error: 'Could not prepare your login account. Please try again.' };
  }

  if (!user.email_confirmed_at) {
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('[activate] Auth confirmation failed:', confirmError.message);
      return { ok: false, error: 'Could not prepare your login account. Please try again.' };
    }
  }

  return { ok: true, userId: user.id, created: false };
}

async function rollbackNewAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[activate] rollback of newly-created Auth user failed:', error.message);
  }
  return !error;
}

export async function POST(request: Request) {
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

  if (!cardCode || !activationSecret || !fullName || !email || !slug || !profileType) {
    return NextResponse.json({ error: 'Please fill in all fields.' }, { status: 400 });
  }

  if (!consent) {
    return NextResponse.json(
      { error: 'Please agree to the Terms and Privacy Policy to continue.' },
      { status: 400 }
    );
  }

  const cleanCode = String(cardCode).trim().toUpperCase();
  const cleanSecret = String(activationSecret).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(fullName).trim();
  const cleanSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
  const cleanType = String(profileType).toUpperCase();

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleanSlug)) {
    return NextResponse.json(
      { error: 'PULSE link can only contain lowercase letters, numbers, and hyphens.' },
      { status: 400 }
    );
  }

  if (cleanType !== 'PROFESSIONAL' && cleanType !== 'PERSONAL') {
    return NextResponse.json({ error: 'Invalid profile type.' }, { status: 400 });
  }

  const authResult = await prepareAuthUser(cleanEmail);

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: 409 });
  }

  const { data, error: rpcError } = await supabaseAdmin.rpc('activate_card', {
    p_card_code: cleanCode,
    p_activation_secret_hash: hashActivationSecret(cleanSecret),
    p_email: cleanEmail,
    p_full_name: cleanName,
    p_slug: cleanSlug,
    p_profile_type: cleanType,
    p_auth_user_id: authResult.userId,
  });

  if (rpcError) {
    console.error('[activate] activate_card RPC error:', rpcError.message);

    if (authResult.created) {
      const rolledBack = await rollbackNewAuthUser(authResult.userId);
      if (!rolledBack) {
        return NextResponse.json(
          { error: 'Activation could not be completed. Please contact support before trying again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Could not reach the database. Please try again.' },
      { status: 503 }
    );
  }

  const result = data as { success?: boolean; error?: string; slug?: string };

  if (result.error) {
    if (authResult.created) {
      const rolledBack = await rollbackNewAuthUser(authResult.userId);
      if (!rolledBack) {
        return NextResponse.json(
          { error: 'Activation could not be completed. Please contact support before trying again.' },
          { status: 503 }
        );
      }
    }

    const status =
      result.error.includes('already been activated') ? 409 :
      result.error.includes('activation secret') ? 403 :
      result.error.includes('PULSE link is already taken') ? 409 :
      result.error.includes('already in use') ? 409 :
      result.error.includes('couldn\'t find that card') ? 404 :
      result.error.includes('being activated right now') ? 409 :
      result.error.includes('already connected') ? 409 :
      result.error.includes('still being removed') ? 409 :
      400;

    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true, slug: result.slug });
}
