// app/api/admin/cards/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!(session && verifyAdminSession(session.value));
}

// GET — fetch all cards with profile info
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('hardware_cards')
    .select('*, profiles(full_name, email, slug, account_id)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: data });
}

// POST — register a new card
export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { card_code } = await request.json();
  if (!card_code?.trim()) return NextResponse.json({ error: 'card_code required' }, { status: 400 });

  const code = card_code.trim().toUpperCase();

  const { data, error } = await supabaseAdmin
    .from('hardware_cards')
    .insert({ card_code: code, status: 'UNCLAIMED' })
    .select('id, card_code')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('admin_actions').insert({
    action: 'REGISTER_CARD',
    card_code: code,
    detail: 'Registered via admin panel',
  });

  return NextResponse.json({ success: true, card: data });
}

// PATCH — disable / enable / release a card
export async function PATCH(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { card_id, action } = await request.json();
  if (!card_id || !action) return NextResponse.json({ error: 'card_id and action required' }, { status: 400 });

  const { data: card } = await supabaseAdmin
    .from('hardware_cards')
    .select('id, card_code, status, profile_id')
    .eq('id', card_id)
    .maybeSingle();

  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  if (action === 'disable') {
    if (card.status === 'UNCLAIMED') return NextResponse.json({ error: 'Cannot disable an unclaimed card' }, { status: 409 });
    const { error } = await supabaseAdmin.from('hardware_cards').update({ status: 'DEACTIVATED' }).eq('id', card_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from('admin_actions').insert({ action: 'DISABLE_CARD', card_code: card.card_code });
    return NextResponse.json({ success: true, status: 'DEACTIVATED' });
  }

  if (action === 'enable') {
    const nextStatus = card.profile_id ? 'ACTIVE' : 'UNCLAIMED';
    const { error } = await supabaseAdmin.from('hardware_cards').update({ status: nextStatus }).eq('id', card_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from('admin_actions').insert({ action: 'ENABLE_CARD', card_code: card.card_code });
    return NextResponse.json({ success: true, status: nextStatus });
  }

  if (action === 'release') {
    const { error } = await supabaseAdmin
      .from('hardware_cards')
      .update({ status: 'UNCLAIMED', profile_id: null })
      .eq('id', card_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from('admin_actions').insert({
      action: 'RELEASE_CARD',
      card_code: card.card_code,
      detail: 'Released from user — card is now transferable',
    });
    return NextResponse.json({ success: true, status: 'UNCLAIMED' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
