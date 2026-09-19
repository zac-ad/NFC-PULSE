// app/api/links/route.ts
// Profile links CRUD — service role, session-verified
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function getUserEmail(request: Request): Promise<string | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await client.auth.getUser(token);
  return user?.email || null;
}

async function verifyProfileOwnership(email: string, profileId: string): Promise<boolean> {
  const { data: account } = await supabaseAdmin
    .from('accounts').select('id').eq('email', email).maybeSingle();
  if (!account) return false;
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id').eq('id', profileId).eq('account_id', account.id).maybeSingle();
  return !!profile;
}

// POST — add a link or QR
export async function POST(request: Request) {
  const email = await getUserEmail(request);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { profile_id, title, url, type, position } = body;
  if (!profile_id || !title || !url) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const owns = await verifyProfileOwnership(email, profile_id);
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('profile_links')
    .insert({ profile_id, title, url, type: type || 'link', position: position || 0 })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}

// DELETE — remove a link
export async function DELETE(request: Request) {
  const email = await getUserEmail(request);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { linkId, profileId } = await request.json();
  if (!linkId || !profileId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const owns = await verifyProfileOwnership(email, profileId);
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // SECURITY: scope delete to both linkId AND profileId to prevent IDOR.
  // Without .eq('profile_id', profileId) an attacker could delete any link
  // by supplying their own profileId (which passes ownership) + a victim's linkId.
  const { data, error } = await supabaseAdmin
    .from('profile_links')
    .delete()
    .eq('id', linkId)
    .eq('profile_id', profileId)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Link not found or access denied' }, { status: 404 });
  return NextResponse.json({ success: true });
}
