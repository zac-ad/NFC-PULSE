// lib/supabaseServerAuth.ts
//
// Reads the login session cookie from within a Server Component or
// Route Handler — this is what lets /t/[code] know "is the phone
// tapping this card currently logged in, and as who?" before it decides
// where to redirect, with no extra round-trip and no visible delay.
//
// Server Components can READ cookies but cannot WRITE them (Next.js
// restriction), so the set/remove callbacks below are wrapped in
// try/catch and quietly do nothing when called from a page — actual
// session refresh is handled by middleware.ts instead. This split is
// the standard, documented pattern for @supabase/ssr with the App
// Router; it's not a shortcut, it's how the library is meant to be used
// here.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — can't write
            // cookies here. Middleware handles refreshing the session;
            // this is safe to ignore.
          }
        },
      },
    }
  );
}
