// app/api/admin/cards/route.ts
// Auth: requireAdmin() — authentication + Origin check on mutations
// Authz: service_role only; anon/authenticated cannot reach supabaseAdmin
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';

export async function GET(request: Request) {
  const check = await requireAdmin(request, { skipOriginCheck: true });
  if (!check.ok) return check.response;

  const { data, error } = await supabaseAdmin
    .from('hardware_cards')
    .select('*, profiles(full_name, email, slug, account_id)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/cards GET]', error.message);
    return NextResponse.json({ error: 'Could not load cards.' }, { status: 500 });
  }
  return NextResponse.json({ cards: data });
}

export async function POST(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return check.response;

  const { card_code } = await request.json();
  if (!card_code?.trim()) {
    return NextResponse.json({ error: 'Card code is required.' }, { status: 400 });
  }

  const code = card_code.trim().toUpperCase();

  const { data, error } = await supabaseAdmin
    .from('hardware_cards')
    .insert({ card_code: code, status: 'UNCLAIMED' })
    .select('id, card_code')
    .single();

  if (error) {
    console.error('[admin/cards POST]', error.message);
    const msg = error.message.includes('unique')
      ? `Card code ${code} already exists.`
      : 'Could not register card. Please try again.';
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  await supabaseAdmin.from('admin_actions').insert({
    action: 'REGISTER_CARD',
    card_code: code,
    detail: `Registered via admin panel (session: ${check.session.id})`,
  });

  return NextResponse.json({ success: true, card: data });
}

export async function PATCH(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return check.response;

  const { card_id, action } = await request.json();
  if (!card_id || !action) {
    return NextResponse.json({ error: 'card_id and action are required.' }, { status: 400 });
  }

  const { data: card } = await supabaseAdmin
    .from('hardware_cards')
    .select('id, card_code, status, profile_id')
    .eq('id', card_id)
    .maybeSingle();

  if (!card) return NextResponse.json({ error: 'Card not found.' }, { status: 404 });

  if (action === 'disable') {
    if (card.status === 'UNCLAIMED') {
      return NextResponse.json({ error: 'Cannot disable an unclaimed card.' }, { status: 409 });
    }
    const { error } = await supabaseAdmin
      .from('hardware_cards').update({ status: 'DEACTIVATED' }).eq('id', card_id);
    if (error) return NextResponse.json({ error: 'Could not disable card.' }, { status: 500 });
    await supabaseAdmin.from('admin_actions').insert({
      action: 'DISABLE_CARD',
      card_code: card.card_code,
      detail: `Disabled by admin session ${check.session.id}`,
    });
    return NextResponse.json({ success: true, status: 'DEACTIVATED' });
  }

  if (action === 'enable') {
    const nextStatus = card.profile_id ? 'ACTIVE' : 'UNCLAIMED';
    const { error } = await supabaseAdmin
      .from('hardware_cards').update({ status: nextStatus }).eq('id', card_id);
    if (error) return NextResponse.json({ error: 'Could not enable card.' }, { status: 500 });
    await supabaseAdmin.from('admin_actions').insert({
      action: 'ENABLE_CARD',
      card_code: card.card_code,
      detail: `Enabled by admin session ${check.session.id}`,
    });
    return NextResponse.json({ success: true, status: nextStatus });
  }

  if (action === 'release') {
    const { error } = await supabaseAdmin
      .from('hardware_cards')
      .update({ status: 'UNCLAIMED', profile_id: null })
      .eq('id', card_id);
    if (error) return NextResponse.json({ error: 'Could not release card.' }, { status: 500 });
    await supabaseAdmin.from('admin_actions').insert({
      action: 'RELEASE_CARD',
      card_code: card.card_code,
      detail: `Released by admin session ${check.session.id}`,
    });
    return NextResponse.json({ success: true, status: 'UNCLAIMED' });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
