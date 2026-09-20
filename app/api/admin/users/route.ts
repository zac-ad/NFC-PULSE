// app/api/admin/users/route.ts
// Auth: requireAdmin() — authentication + Origin check
// Authz: most destructive admin action — deletes account, profile, releases card
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';

export async function DELETE(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return check.response;

  const { account_id, card_code } = await request.json();
  if (!account_id) {
    return NextResponse.json({ error: 'account_id is required.' }, { status: 400 });
  }

  // Verify account exists before doing anything
  const { data: account } = await supabaseAdmin
    .from('accounts').select('id').eq('id', account_id).maybeSingle();
  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles').select('id').eq('account_id', account_id);

  const profileIds = (profiles || []).map(p => p.id);

  if (profileIds.length > 0) {
    await supabaseAdmin
      .from('hardware_cards')
      .update({ status: 'UNCLAIMED', profile_id: null })
      .in('profile_id', profileIds);

    await supabaseAdmin.from('profile_links').delete().in('profile_id', profileIds);
    await supabaseAdmin.from('profiles').delete().eq('account_id', account_id);
  }

  const { error } = await supabaseAdmin
    .from('accounts').delete().eq('id', account_id);

  if (error) {
    console.error('[admin/users DELETE]', error.message);
    return NextResponse.json({ error: 'Could not delete account.' }, { status: 500 });
  }

  await supabaseAdmin.from('admin_actions').insert({
    action: 'DELETE_USER',
    card_code: card_code || null,
    detail: `Account ${account_id} deleted by admin session ${check.session.id}. Card released.`,
  });

  return NextResponse.json({ success: true });
}
