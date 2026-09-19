import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyOrgSessionCookieValue, COOKIE_NAME } from '@/lib/orgSession';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const orgId = verifyOrgSessionCookieValue(cookieStore.get(COOKIE_NAME)?.value);
  if (!orgId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from('hardware_cards').select('id, status').eq('id', id).eq('org_id', orgId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Card not found.' }, { status: 404 });

  // Only ACTIVE ↔ LOCKED is a valid toggle. UNCLAIMED/DEACTIVATED must not
  // be silently set to ACTIVE by a lock endpoint.
  if (existing.status !== 'ACTIVE' && existing.status !== 'LOCKED') {
    return NextResponse.json(
      { error: `Cannot toggle a card in status "${existing.status}".` },
      { status: 409 }
    );
  }

  const nextStatus = existing.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';

  const { error } = await supabaseAdmin
    .from('hardware_cards')
    .update({ status: nextStatus })
    .eq('id', id)
    .eq('org_id', orgId);

  // SECURITY: check the update actually succeeded — don't silently return success
  if (error) {
    console.error('toggle-lock update failed:', error.message);
    return NextResponse.json({ error: 'Failed to update card status.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
