import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const activationFlow = requestUrl.searchParams.get('flow') === 'activation';
  const earlyActivationRequestId = requestUrl.searchParams.get('request_id');
  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('Auth callback exchange failed:', exchangeError.message);
    if (activationFlow && earlyActivationRequestId && UUID_RE.test(earlyActivationRequestId)) {
      const recovery = new URL('/activate/retry', request.url);
      recovery.searchParams.set('activation', 'exchange-failed');
      recovery.searchParams.set('request_id', earlyActivationRequestId);
      return clearActivationCookie(NextResponse.redirect(recovery));
    }
    return clearActivationCookie(NextResponse.redirect(new URL('/portal?auth=failed', request.url)));
  }

  const requestedNext = requestUrl.searchParams.get('next') || '/dashboard';
  const safeNext = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard';

  // Standard sign-in links must never trigger card activation, even if a stale
  // activation-request cookie remains in this browser.
  if (!activationFlow) {
    const standardLogin = NextResponse.redirect(new URL(safeNext, request.url));
    clearActivationCookie(standardLogin);
    return standardLogin;
  }

  const cookieStore = await cookies();
  // The email redirect carries the request ID so verification can finish on another device.
  // The HttpOnly cookie remains a same-device fallback for older links.
  const activationRequestId = requestUrl.searchParams.get('request_id')
    || cookieStore.get('pulse_activation_request')?.value;
  if (!activationRequestId || !UUID_RE.test(activationRequestId)) {
    const missing = NextResponse.redirect(new URL('/activate?activation=missing-request', request.url));
    clearActivationCookie(missing);
    return missing;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id || !userData.user.email) {
    console.error('Activation callback could not verify Auth user.');
    const failed = NextResponse.redirect(new URL('/activate?activation=failed', request.url));
    clearActivationCookie(failed);
    return failed;
  }

  const retryRedirect = (reason: string) => {
    const target = new URL('/activate/retry', request.url);
    target.searchParams.set('activation', reason);
    target.searchParams.set('request_id', activationRequestId);
    const response = NextResponse.redirect(target);
    clearActivationCookie(response);
    return response;
  };

  const { data, error: finalizeError } = await supabaseAdmin.rpc('finalize_card_activation', {
    p_request_id: activationRequestId,
    p_auth_user_id: userData.user.id,
  });
  if (finalizeError) {
    console.error('Activation finalization RPC failed:', finalizeError.message);
    return retryRedirect('retry');
  }

  const result = data as { success?: boolean; error?: string };
  if (!result?.success) {
    console.error('Activation finalization rejected:', result?.error || 'Unknown activation error');
    return retryRedirect('retry');
  }

  const success = NextResponse.redirect(new URL('/dashboard?activated=1', request.url));
  clearActivationCookie(success);
  return success;
}
