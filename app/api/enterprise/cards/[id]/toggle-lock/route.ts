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
  const nextStatus = existing.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
  await supabaseAdmin.from('hardware_cards').update({ status: nextStatus }).eq('id', id).eq('org_id', orgId);
  return NextResponse.json({ success: true, status: nextStatus });
}
