import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

async function getUserEmail(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await client.auth.getUser(token);
  return user?.email || null;
}

export async function GET(request: Request) {
  const userEmail = await getUserEmail(request);
  if (!userEmail) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = new URL(request.url).searchParams.get('profileId')?.trim();
  if (!profileId) {
    return noStoreJson({ error: 'profileId required' }, { status: 400 });
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('email', userEmail)
    .maybeSingle();

  if (accountError) {
    return noStoreJson({ error: 'Account lookup failed' }, { status: 500 });
  }
  if (!account) {
    return noStoreJson({ error: 'Account not found' }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('account_id', account.id)
    .maybeSingle();

  if (profileError) {
    return noStoreJson({ error: 'Profile lookup failed' }, { status: 500 });
  }
  if (!profile) {
    return noStoreJson({ error: 'Profile not found' }, { status: 404 });
  }

  const [{ data: card, error: cardError }, { data: taps, error: tapsError }] = await Promise.all([
    supabaseAdmin
      .from('hardware_cards')
      .select('card_code, tap_count')
      .eq('profile_id', profile.id)
      .maybeSingle(),
    supabaseAdmin
      .from('card_taps')
      .select('id, created_at, city, country, user_agent')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (cardError || tapsError) {
    return noStoreJson({ error: 'Telemetry lookup failed' }, { status: 500 });
  }

  return noStoreJson({
    card: card || null,
    taps: taps || [],
  });
}
