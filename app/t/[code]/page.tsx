import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function TapRouterPage({ params }: PageProps) {
  const h = await headers();
  const resolvedParams = await params;
  const cardCode = resolvedParams.code?.trim().toUpperCase();

  if (!cardCode) redirect('/card-disabled');

  // 20 lookups per IP per minute — generous for real use (no one taps
  // 20 different cards in a minute) but blocks a script enumerating
  // CARD-0001 through CARD-9999 to discover which codes are real.
  // Redirects to the same /card-disabled page as an invalid card would,
  // rather than a distinct "rate limited" message — that way a scripted
  // attacker can't tell the difference between "this code doesn't exist"
  // and "you're being rate limited," which would otherwise leak useful
  // information back to them.
  const ip = h.get('x-forwarded-for') || 'unknown';
  const allowed = await checkRateLimit(`tap:${ip}`, 20, 60);
  if (!allowed) redirect('/card-disabled');

  const { data: card } = await supabase
    .from('hardware_cards')
    .select('*, profiles(*)')
    .eq('card_code', cardCode)
    .single();

  if (!card || card.status === 'UNCLAIMED') redirect(`/activate?code=${cardCode}`);
  if (card.status === 'DEACTIVATED') redirect('/card-disabled');

  if (card.status === 'ACTIVE' && card.profile_id) {
    // ── Owner check ──────────────────────────────────────────
    // If the phone tapping this card already has a valid PULSE login
    // session (a cookie, readable here server-side before anything is
    // sent back), and that session belongs to the account that owns
    // THIS specific card, send them straight to their dashboard instead
    // of the public profile — and skip logging it as a tap, since it's
    // the owner checking their own card, not a real visitor.
    //
    // Accounts aren't keyed by auth.uid() in this schema (see
    // lib/supabaseAdmin.ts usage elsewhere) — they're matched by email.
    // So: get the session's email, look up that account, compare its id
    // to the profile's account_id. A stranger logged into their OWN
    // PULSE account who taps someone else's card still correctly lands
    // on the public profile, because the ids won't match.
    //
    // Everything here is wrapped in try/catch and never throws outward.
    // This whole block only decides WHETHER to redirect to /dashboard —
    // redirect() itself is called after, outside the try, since
    // Next.js's redirect() works by throwing internally and a try/catch
    // around it would swallow that throw and silently break the
    // redirect instead of performing it. If anything here fails for any
    // reason, isOwner just stays false and the normal tap flow below
    // proceeds exactly as it would for a stranger — this check can
    // never be the reason a real tap fails to resolve.
    let isOwner = false;
    try {
      const supabaseServerAuth = await createSupabaseServerClient();
      const { data: { user } } = await supabaseServerAuth.auth.getUser();

      if (user?.email) {
        // Uses the service-role client, not the anon one — the
        // "Accounts are private" RLS policy checks auth.uid() = id, but
        // this schema keys accounts by email rather than by the
        // Supabase auth id, so that policy would silently block this
        // lookup via the anon key and this redirect would never fire.
        // Safe here because it's a read-only check, server-side only,
        // used purely to decide which page to redirect to — nothing
        // from it is exposed to the client.
        const { data: account } = await supabaseAdmin
          .from('accounts')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        isOwner = !!(account && account.id === card.profiles?.account_id);
      }
    } catch (err) {
      console.error('Owner check failed, falling back to normal tap flow:', err);
    }

    if (isOwner) redirect('/dashboard');

    // Geo data from Vercel edge headers
    const city    = decodeURIComponent(h.get('x-vercel-ip-city')    || 'Unknown');
    const region  = decodeURIComponent(h.get('x-vercel-ip-region')  || 'Unknown');
    const country = h.get('x-vercel-ip-country') || 'PH';
    const tapIp   = h.get('x-forwarded-for')     || '127.0.0.1';
    const ua      = h.get('user-agent')           || '';

    // Log the tap with full geo + device data
    await supabase.from('card_taps').insert({
      card_id:    card.id,
      profile_id: card.profile_id,
      ip_address: tapIp,
      city,
      region,
      country,
      user_agent: ua,
    });

    // Atomic increment via RPC — no race condition on concurrent taps
    await supabase.rpc('increment_tap_count', { card_id: card.id });

    const profileSlug = card.profiles?.slug;
    if (profileSlug) redirect(`/p/${profileSlug}`);
  }

  redirect('/card-disabled');
}
