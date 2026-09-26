import { NextResponse } from 'next/server';
import { generateCardCode } from '@/lib/cardCode';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type RotationAction = 'prepare' | 'finalize' | 'discard';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin(request);
  if (!check.ok) return check.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Card id is required.' }, { status: 400 });
  }

  let action: RotationAction;
  try {
    const body = await request.json();
    action = body?.action;
  } catch {
    return NextResponse.json({ error: 'A valid action is required.' }, { status: 400 });
  }

  if (action !== 'prepare' && action !== 'finalize' && action !== 'discard') {
    return NextResponse.json({ error: 'Action must be prepare, finalize, or discard.' }, { status: 400 });
  }

  const { data: card, error: lookupError } = await supabaseAdmin
    .from('hardware_cards')
    .select('id, card_code, status, pending_card_code, pending_card_code_created_at')
    .eq('id', id)
    .maybeSingle();

  if (lookupError) {
    console.error('[admin/cards/rotate lookup]', lookupError.message);
    return NextResponse.json({ error: 'Could not load card.' }, { status: 500 });
  }

  if (!card) {
    return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
  }

  if (action === 'prepare') {
    if (card.pending_card_code) {
      return NextResponse.json(
        { error: 'This card already has a pending replacement code. Finalize or discard that rotation first.' },
        { status: 409 }
      );
    }

    const replacementCode = generateCardCode();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('hardware_cards')
      .update({
        pending_card_code: replacementCode,
        pending_card_code_created_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('pending_card_code', null)
      .select('id, status, pending_card_code, pending_card_code_created_at')
      .maybeSingle();

    if (updateError) {
      console.error('[admin/cards/rotate prepare]', updateError.message);
      return NextResponse.json(
        { error: 'Could not prepare card rotation. Please try again.' },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'This card already has a pending replacement code. Finalize or discard that rotation first.' },
        { status: 409 }
      );
    }

    await supabaseAdmin.from('admin_actions').insert({
      action: 'PREPARE_CARD_ROTATION',
      card_code: card.card_code,
      detail: `Prepared replacement code for card ${card.id} (session: ${check.session.id}).`,
    });

    return NextResponse.json({
      success: true,
      action: 'prepare',
      card: updated,
      physicalVerificationRequired: true,
    });
  }

  if (!card.pending_card_code) {
    return NextResponse.json(
      { error: 'No pending replacement code exists. Prepare the rotation first.' },
      { status: 409 }
    );
  }

  if (action === 'discard') {
    const { data: discarded, error: discardError } = await supabaseAdmin
      .from('hardware_cards')
      .update({
        pending_card_code: null,
        pending_card_code_created_at: null,
      })
      .eq('id', id)
      .eq('pending_card_code', card.pending_card_code)
      .select('id, status')
      .maybeSingle();

    if (discardError) {
      console.error('[admin/cards/rotate discard]', discardError.message);
      return NextResponse.json({ error: 'Could not discard the pending rotation.' }, { status: 500 });
    }

    if (!discarded) {
      return NextResponse.json(
        { error: 'Card rotation changed before discard. No pending code was removed.' },
        { status: 409 }
      );
    }

    await supabaseAdmin.from('admin_actions').insert({
      action: 'DISCARD_CARD_ROTATION',
      card_code: card.card_code,
      detail: `Discarded pending card-code rotation for card ${card.id} (session: ${check.session.id}).`,
    });

    return NextResponse.json({
      success: true,
      action: 'discard',
      card: discarded,
      currentCodeStillActive: true,
    });
  }

  // The current code remains valid until this single update succeeds.
  // The unique card_code constraint prevents a live-credential collision.
  // No alias to the old code is retained after finalization.
  const { data: finalized, error: finalizeError } = await supabaseAdmin
    .from('hardware_cards')
    .update({
      card_code: card.pending_card_code,
      pending_card_code: null,
      pending_card_code_created_at: null,
    })
    .eq('id', id)
    .eq('pending_card_code', card.pending_card_code)
    .select('id, card_code, status')
    .maybeSingle();

  if (finalizeError) {
    console.error('[admin/cards/rotate finalize]', finalizeError.message);
    return NextResponse.json(
      { error: 'Could not finalize card rotation. The current card code remains active.' },
      { status: 409 }
    );
  }

  if (!finalized) {
    return NextResponse.json(
      { error: 'Card rotation changed before finalization. No code was replaced.' },
      { status: 409 }
    );
  }

  await supabaseAdmin.from('admin_actions').insert({
    action: 'FINALIZE_CARD_ROTATION',
    card_code: finalized.card_code,
    detail: `Finalized card code rotation for card ${card.id}; previous code invalidated (session: ${check.session.id}).`,
  });

  return NextResponse.json({
    success: true,
    action: 'finalize',
    card: finalized,
    oldCodeInvalidated: true,
  });
}
