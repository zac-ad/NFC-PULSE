import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  let body: { requestId?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return NextResponse.json({ error: 'Activation request is invalid.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user?.id || !user.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: 'Please sign in with a verified email address to continue.' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.rpc('finalize_card_activation', {
    p_request_id: requestId,
    p_auth_user_id: user.id,
  });
  if (error) {
    console.error('Activation resume finalization failed:', error.message);
    return NextResponse.json({ error: 'Activation could not be completed. Please try again.' }, { status: 503 });
  }
  const result = data as { success?: boolean; error?: string; slug?: string } | null;
  if (!result?.success) {
    return NextResponse.json({ error: result?.error || 'Activation could not be completed.' }, { status: 400 });
  }
  return NextResponse.json({ success: true, redirect: '/dashboard?activated=1' });
}
