// app/api/admin/users/route.ts
// Admin user deletion — removes account + profile, releases linked card.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!(session && verifyAdminSession(session.value));
}

// DELETE — remove a user account + profile, release their card back to UNCLAIMED
export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { account_id, card_code } = await request.json();
  if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

  // 1. Find profiles linked to this account
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('account_id', account_id);

  const profileIds = (profiles || []).map(p => p.id);

  // 2. Release any hardware cards linked to these profiles → back to UNCLAIMED
  if (profileIds.length > 0) {
    await supabaseAdmin
      .from('hardware_cards')
      .update({ status: 'UNCLAIMED', profile_id: null })
      .in('profile_id', profileIds);
  }

  // 3. Delete profile links
  if (profileIds.length > 0) {
    await supabaseAdmin.from('profile_links').delete().in('profile_id', profileIds);
  }

  // 4. Delete profiles
  await supabaseAdmin.from('profiles').delete().eq('account_id', account_id);

  // 5. Delete account
  const { error } = await supabaseAdmin.from('accounts').delete().eq('id', account_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 6. Log the action
  await supabaseAdmin.from('admin_actions').insert({
    action: 'DELETE_USER',
    card_code: card_code || null,
    detail: `Account ${account_id} deleted, card released to UNCLAIMED`,
  });

  return NextResponse.json({ success: true });
}
