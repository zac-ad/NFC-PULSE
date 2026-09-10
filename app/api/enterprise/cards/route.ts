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
  if (!cardCode || !employeeName || !employeeEmail)
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('hardware_cards')
    .update({ status: 'ACTIVE', employee_name: employeeName, employee_title: employeeTitle || null, email: employeeEmail, org_id: orgId })
    .eq('card_code', cardCode.toUpperCase().trim())
    .or(`org_id.is.null,org_id.eq.${orgId}`)
    .select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Card not found or belongs to another org.' }, { status: 404 });
  return NextResponse.json({ success: true, card: data });
}
