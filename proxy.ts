// proxy.ts (project root — NOT inside app/; Next.js 16 renamed the
// "middleware.ts" convention to "proxy.ts", same API)
//
// @supabase/ssr needs somewhere that can both READ and WRITE the session
// cookie on every request, to keep it refreshed before it expires.
// Server Components can only read cookies, not write them — so that
// job falls to middleware, which runs before every matched request.
//
// This does not add a redirect or a visible delay for anyone. It just
// touches the session cookie so it stays valid; if there's no session,
// it does nothing.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching getUser() is what actually triggers the refresh-if-needed
  // logic inside the client — the return value isn't used here.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
