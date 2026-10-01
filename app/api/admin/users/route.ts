// app/api/admin/users/route.ts
// Auth: requireAdmin() — authentication + Origin check
// Authz: destructive admin action — removes the app account, auth identity,
// releases every owned card, clears viewer sessions, and removes profile media.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';
import { generateActivationSecret, hashActivationSecret } from '@/lib/activationSecret';

export async function DELETE(request: Request) {
  const check = await requireAdmin(request);
  if (!check.ok) return check.response;

  const { account_id } = await request.json();
  if (!account_id) {
    return NextResponse.json({ error: 'account_id is required.' }, { status: 400 });
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('id, email')
    .eq('id', account_id)
    .maybeSingle();

  if (accountError) {
    console.error('[admin/users DELETE] account lookup:', accountError.message);
    return NextResponse.json({ error: 'Could not verify account.' }, { status: 500 });
  }
  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('account_id', account_id);

  if (profilesError) {
    console.error('[admin/users DELETE] profile lookup:', profilesError.message);
    return NextResponse.json({ error: 'Could not load account profiles.' }, { status: 500 });
  }

  const profileIds = (profiles || []).map(profile => profile.id);

  // Remove private profile media before deleting the profile rows. The bucket
  // is private, and leaving old media behind would retain deleted user data.
  for (const profileId of profileIds) {
    const { data: media, error: mediaListError } = await supabaseAdmin.storage
      .from('profile-media')
      .list(profileId, { limit: 1000 });

    if (mediaListError) {
      console.error('[admin/users DELETE] media lookup:', mediaListError.message);
      return NextResponse.json({ error: 'Could not clean up profile media.' }, { status: 500 });
    }

    const paths = (media || [])
      .filter(item => item.name)
      .map(item => `${profileId}/${item.name}`);

    if (paths.length > 0) {
      const { error: mediaDeleteError } = await supabaseAdmin.storage
        .from('profile-media')
        .remove(paths);

      if (mediaDeleteError) {
        console.error('[admin/users DELETE] media removal:', mediaDeleteError.message);
        return NextResponse.json({ error: 'Could not clean up profile media.' }, { status: 500 });
      }
    }
  }

  // Release every card owned by every profile in this account. Generate a
  // fresh activation secret for each card and clear all user-specific
  // lifecycle state. NFC protection fields are intentionally untouched:
  // deleting a user must not change the physical NTAG21x state.
  if (profileIds.length > 0) {
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('hardware_cards')
      .select('id, card_code')
      .in('profile_id', profileIds);

    if (cardsError) {
      console.error('[admin/users DELETE] card lookup:', cardsError.message);
      return NextResponse.json({ error: 'Could not load assigned cards.' }, { status: 500 });
    }

    for (const card of cards || []) {
      const activationSecret = generateActivationSecret();

      const { error: sessionsError } = await supabaseAdmin
        .from('viewer_sessions')
        .delete()
        .eq('card_id', card.id);

      if (sessionsError) {
        console.error('[admin/users DELETE] viewer session cleanup:', sessionsError.message);
        return NextResponse.json({ error: 'Could not clear card sessions.' }, { status: 500 });
      }

      const { error: releaseError } = await supabaseAdmin
        .from('hardware_cards')
        .update({
          status: 'UNCLAIMED',
          profile_id: null,
          tap_count: 0,
          pending_card_code: null,
          pending_card_code_created_at: null,
          activation_secret_hash: hashActivationSecret(activationSecret),
          activation_secret_issued_at: new Date().toISOString(),
        })
        .eq('id', card.id);

      if (releaseError) {
        console.error('[admin/users DELETE] card release:', releaseError.message);
        return NextResponse.json({ error: 'Could not release assigned card.' }, { status: 500 });
      }
    }
  }

  const { error: accountDeleteError } = await supabaseAdmin
    .from('accounts')
    .delete()
    .eq('id', account_id);

  if (accountDeleteError) {
    console.error('[admin/users DELETE] account deletion:', accountDeleteError.message);
    return NextResponse.json({ error: 'Could not delete account.' }, { status: 500 });
  }

  // public.accounts intentionally does not reference auth.users, so deleting
  // the app account alone would leave the login identity behind. Find the
  // matching Auth user server-side and remove it as part of the same admin
  // lifecycle. If no Auth user exists (legacy/test data), public cleanup still
  // succeeds.
  const { data: authUsers, error: authLookupError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authLookupError) {
    console.error('[admin/users DELETE] auth lookup:', authLookupError.message);
    return NextResponse.json(
      { error: 'Account data was removed, but the login identity could not be cleaned up. Please remove the Auth user manually.' },
      { status: 500 }
    );
  }

  const authUser = authUsers.users.find(
    user => user.email?.trim().toLowerCase() === account.email.trim().toLowerCase()
  );

  if (authUser) {
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);

    if (authDeleteError) {
      console.error('[admin/users DELETE] auth deletion:', authDeleteError.message);
      return NextResponse.json(
        { error: 'Account data was removed, but the login identity could not be deleted. Please retry the Auth cleanup manually.' },
        { status: 500 }
      );
    }
  }

  await supabaseAdmin.from('admin_actions').insert({
    action: 'DELETE_USER',
    card_code: null,
    detail: `Account ${account_id} (${account.email}) deleted by admin session ${check.session.id}. Assigned cards released and login identity removed.`,
  });

  return NextResponse.json({ success: true });
}
