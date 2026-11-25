import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  if (!UUID_RE.test(requestId)) {
    return NextResponse.json({ error: 'Invalid activation request.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user?.id || !user.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: 'Please sign in and verify your email before retrying activation.' }, { status: 401 });
  }

  if (!(await checkRateLimit(`activation-retry-user:${user.id}`, 5, 600)) ||
      !(await checkRateLimit(`activation-retry-ip:${ip}`, 15, 600))) {
    return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 });
  }

  const { data, error } = await supabaseAdmin.rpc('finalize_card_activation', {
    p_request_id: requestId,
    p_auth_user_id: user.id,
  });
  if (error) {
    console.error('Activation retry RPC failed:', error.message);
    return NextResponse.json({ error: 'Activation could not be completed right now. Please try again.' }, { status: 503 });
  }

  const result = data as { success?: boolean; error?: string; already_completed?: boolean };
  if (!result?.success) {
    return NextResponse.json({ error: result?.error || 'Activation could not be completed.' }, { status: 409 });
  }

  return NextResponse.json({ success: true, already_completed: !!result.already_completed });
}
