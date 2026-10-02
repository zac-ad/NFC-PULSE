// app/api/admin/users/route.ts
// Auth: requireAdmin() — authentication + Origin check
// Destructive lifecycle: mark the account as DELETING, clean private data,
// remove the exact Auth identity, release cards, then remove the PULSE account.
//
// Auth and Postgres cannot share one transaction. The DELETING state makes the
// operation resumable: if any later step fails, a retry continues from the
// remaining state instead of pretending the account was fully deleted.

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
    .select('id, email, auth_user_id, deletion_status')
    .eq('id', account_id)
    .maybeSingle();

  if (accountError) {
    console.error('[admin/users DELETE] account lookup:', accountError.message);
    return NextResponse.json({ error: 'Could not verify account.' }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  // Make the operation explicitly resumable before touching any dependent data.
  if (account.deletion_status !== 'DELETING') {
    const { error: markDeletingError } = await supabaseAdmin
      .from('accounts')
      .update({ deletion_status: 'DELETING' })
      .eq('id', account_id)
      .eq('deletion_status', 'ACTIVE');

    if (markDeletingError) {
      console.error('[admin/users DELETE] mark deleting:', markDeletingError.message);
      return NextResponse.json({ error: 'Could not start account deletion.' }, { status: 500 });
    }
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

  // Remove private profile media before the profile rows disappear. Repeating
  // this during a retry is safe because an already-empty folder is fine.
  for (const profileId of profileIds) {
    const { data: media, error: mediaListError } = await supabaseAdmin.storage
      .from('profile-media')
      .list(profileId, { limit: 1000 });

    if (mediaListError) {
      console.error('[admin/users DELETE] media lookup:', mediaListError.message);
      return NextResponse.json({ error: 'Could not clean up profile media. Deletion is still in progress.' }, { status: 500 });
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
        return NextResponse.json({ error: 'Could not clean up profile media. Deletion is still in progress.' }, { status: 500 });
      }
    }
  }

  // Viewer sessions are disposable and should be removed before ownership is
  // released. A retry simply finds nothing to remove.
  if (profileIds.length > 0) {
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('hardware_cards')
      .select('id, card_code')
      .in('profile_id', profileIds);

    if (cardsError) {
      console.error('[admin/users DELETE] card lookup:', cardsError.message);
      return NextResponse.json({ error: 'Could not load assigned cards. Deletion is still in progress.' }, { status: 500 });
    }

    for (const card of cards || []) {
      const { error: sessionsError } = await supabaseAdmin
        .from('viewer_sessions')
        .delete()
        .eq('card_id', card.id);

      if (sessionsError) {
        console.error('[admin/users DELETE] viewer session cleanup:', sessionsError.message);
        return NextResponse.json({ error: 'Could not clear card sessions. Deletion is still in progress.' }, { status: 500 });
      }
    }
  }

  // Remove the exact Auth identity recorded on the PULSE account. We never
  // scan Auth users by email during deletion.
  if (account.auth_user_id) {
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      account.auth_user_id
    );

    if (authDeleteError) {
      console.error('[admin/users DELETE] auth deletion:', authDeleteError.message);
      return NextResponse.json(
        { error: 'The login identity could not be deleted. The account is safely marked for cleanup; please retry.' },
        { status: 500 }
      );
    }
  }

  // Release every owned card only after the login identity has been removed.
  // A retry is safe: only cards still linked to these profiles are selected.
  if (profileIds.length > 0) {
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('hardware_cards')
      .select('id')
      .in('profile_id', profileIds);

    if (cardsError) {
      console.error('[admin/users DELETE] card lookup before release:', cardsError.message);
      return NextResponse.json({ error: 'Could not load cards for release. Deletion is still in progress.' }, { status: 500 });
    }

    for (const card of cards || []) {
      const activationSecret = generateActivationSecret();

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
        .eq('id', card.id)
        .eq('status', 'ACTIVE')
        .not('profile_id', 'is', null);

      if (releaseError) {
        console.error('[admin/users DELETE] card release:', releaseError.message);
        return NextResponse.json({ error: 'Could not release all cards. Deletion is still in progress; please retry.' }, { status: 500 });
      }
    }
  }

  const { error: accountDeleteError } = await supabaseAdmin
    .from('accounts')
    .delete()
    .eq('id', account_id)
    .eq('deletion_status', 'DELETING');

  if (accountDeleteError) {
    console.error('[admin/users DELETE] account deletion:', accountDeleteError.message);
    return NextResponse.json(
      { error: 'The login and cards were cleaned up, but the PULSE account record could not be removed. Please retry.' },
      { status: 500 }
    );
  }

  const { error: auditError } = await supabaseAdmin.from('admin_actions').insert({
    action: 'DELETE_USER',
    card_code: null,
    detail: `Account ${account_id} (${account.email}) deleted by admin session ${check.session.id}. Assigned cards released and login identity removed.`,
  });

  if (auditError) {
    // The destructive operation already succeeded. Do not report a false
    // deletion failure just because the audit insert failed.
    console.error('[admin/users DELETE] audit log:', auditError.message);
  }

  return NextResponse.json({ success: true });
}
