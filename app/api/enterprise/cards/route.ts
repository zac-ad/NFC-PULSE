import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyOrgSessionCookieValue, COOKIE_NAME } from '@/lib/orgSession';

async function requireOrgId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifyOrgSessionCookieValue(cookieStore.get(COOKIE_NAME)?.value);
}

export async function GET() {
  const orgId = await requireOrgId();
  if (!orgId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('hardware_cards').select('*').eq('org_id', orgId).order('card_code', { ascending: true });
  if (error) return NextResponse.json({ error: 'Failed to load cards.' }, { status: 500 });
  return NextResponse.json({ cards: data });
}

export async function POST(request: Request) {
  const orgId = await requireOrgId();
  if (!orgId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { cardCode, employeeName, employeeTitle, employeeEmail } = await request.json();
  if (!cardCode || !employeeName || !employeeEmail) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const code = cardCode.toUpperCase().trim();

  // SECURITY: inspect the card before updating it. An organization may claim
  // only an unclaimed card, or update a card already owned by that same org.
  // A normal PULSE card has org_id = NULL, so checking only org_id previously
  // allowed enterprise login holders to take over an already-ACTIVE personal card.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('hardware_cards')
    .select('id, card_code, status, org_id')
    .eq('card_code', code)
    .maybeSingle();

  if (lookupError) {
    console.error('[enterprise/cards POST] card lookup failed:', lookupError.message);
    return NextResponse.json({ error: 'Could not verify card.' }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
  }

  const sameOrg = existing.org_id === orgId;

  if (!sameOrg && existing.org_id !== null) {
    return NextResponse.json({ error: 'Card not found or belongs to another org.' }, { status: 404 });
  }

  if (!sameOrg && existing.status !== 'UNCLAIMED') {
    return NextResponse.json(
      { error: 'Card is already assigned and cannot be claimed by this organization.' },
      { status: 409 }
    );
  }

  // Do not let this endpoint silently unlock a card that the same org locked.
  // New unclaimed cards become ACTIVE when assigned; existing org cards keep
  // their current status.
  const nextStatus = sameOrg ? existing.status : 'ACTIVE';

  if (nextStatus === 'DEACTIVATED') {
    return NextResponse.json(
      { error: 'A deactivated card cannot be assigned or updated here.' },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('hardware_cards')
    .update({
      status: nextStatus,
      employee_name: employeeName,
      employee_title: employeeTitle || null,
      email: employeeEmail,
      org_id: orgId,
    })
    .eq('id', existing.id)
    .eq('org_id', sameOrg ? orgId : null)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[enterprise/cards POST] card update failed:', error.message);
    return NextResponse.json({ error: 'Could not update card.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Card could not be updated.' }, { status: 409 });
  }

  return NextResponse.json({ success: true, card: data });
}
