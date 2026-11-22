import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/portal', request.url));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Auth callback exchange failed:', error.message);
    return NextResponse.redirect(new URL('/portal?auth=failed', request.url));
  }

  // Activation verification is handled by PULSE-owned tokens and the
  // authenticated resume route. Legacy activation callbacks cannot finalize.
  if (requestUrl.searchParams.get('flow') === 'activation') {
    return NextResponse.redirect(new URL('/activate?activation=legacy-link', request.url));
  }

  const requestedNext = requestUrl.searchParams.get('next') || '/dashboard';
  const safeNext = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard';
  return NextResponse.redirect(new URL(safeNext, request.url));
}
