// app/api/profile/route.ts
// All dashboard writes go through here using the service role key.
// The user's Supabase session JWT is verified server-side — no RLS needed.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function getAuthUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  // Verify the JWT with Supabase
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await client.auth.getUser(token);
  return user?.email || null;
}

// GET — load profiles + links for the logged-in user
export async function GET(request: Request) {
  const userEmail = await getAuthUserId(request);
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from('accounts').select('id, email').eq('email', userEmail).maybeSingle();

  if (!account) return NextResponse.json({ profiles: [] });

  const { data: profiles } = await supabaseAdmin
    .from('profiles').select('*').eq('account_id', account.id);

  return NextResponse.json({ profiles: profiles || [], account });
}

// PATCH — update a profile
export async function PATCH(request: Request) {
  const userEmail = await getAuthUserId(request);
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { profileId, ...fields } = body;
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

  // Verify the profile belongs to this user
  const { data: account } = await supabaseAdmin
    .from('accounts').select('id').eq('email', userEmail).maybeSingle();
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id').eq('id', profileId).eq('account_id', account.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { error } = await supabaseAdmin
    .from('profiles').update(fields).eq('id', profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
