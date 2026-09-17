// lib/supabaseBrowser.ts
//
// Replaces the plain supabase-js client for anything that touches the
// login SESSION specifically (signing in, reading the current session,
// signing out). Unlike lib/supabase.ts, this stores the session in a
// cookie instead of localStorage — which is what makes it possible for
// a Server Component (like /t/[code]) to read "is this browser logged
// in?" before it ever sends a response back. localStorage is invisible
// to the server; cookies are sent with every request automatically.
//
// Public data reads that don't care about who's logged in (profiles,
// links, card lookups) can keep using lib/supabase.ts as before — only
// auth-related calls need to move to this client.

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  );
}
