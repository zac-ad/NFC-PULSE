import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Auth callback exchange failed:', error.message);
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
