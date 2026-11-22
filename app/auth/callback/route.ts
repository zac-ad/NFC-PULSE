import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/portal', request.url));

  const clearActivationCookie = (response: NextResponse) => {
    response.cookies.set('pulse_activation_request', '', {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/auth/callback', maxAge: 0,
    });
    return response;
  };

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('Auth callback exchange failed:', exchangeError.message);
    return clearActivationCookie(NextResponse.redirect(new URL('/portal?auth=failed', request.url)));
  }

  const cookieStore = await cookies();
  const activationRequestId = cookieStore.get('pulse_activation_request')?.value;
  if (!activationRequestId) return NextResponse.redirect(new URL('/activate?activation=missing-request', request.url));

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id || !userData.user.email) {
    console.error('Activation callback could not verify Auth user.');
    const failed = NextResponse.redirect(new URL('/activate?activation=failed', request.url));
    clearActivationCookie(failed);
    return failed;
  }

  const { data, error: finalizeError } = await supabaseAdmin.rpc('finalize_card_activation', {
    p_request_id: activationRequestId,
    p_auth_user_id: userData.user.id,
  });
  if (finalizeError) {
    console.error('Activation finalization RPC failed:', finalizeError.message);
    const failed = NextResponse.redirect(new URL('/activate?activation=failed', request.url));
    clearActivationCookie(failed);
    return failed;
  }

  const result = data as { success?: boolean; error?: string };
  if (!result?.success) {
    console.error('Activation finalization rejected:', result?.error || 'Unknown activation error');
    const failed = NextResponse.redirect(new URL('/activate?activation=failed', request.url));
    clearActivationCookie(failed);
    return failed;
  }

  const success = NextResponse.redirect(new URL('/dashboard?activated=1', request.url));
  clearActivationCookie(success);
  return success;
}
