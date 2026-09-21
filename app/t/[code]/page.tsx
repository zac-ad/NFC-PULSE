import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';
import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/rateLimit';
import { createHash, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const INACTIVITY_MINUTES = 30;

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function TapRouterPage({ params }: PageProps) {
  const h = await headers();
  const resolvedParams = await params;
  const cardCode = resolvedParams.code?.trim().toUpperCase();

  if (!cardCode) redirect('/card-disabled');

  // Rate limit: 20 taps per IP per minute.
  // Redirects to /card-disabled rather than a distinct "rate limited" page
  // so an enumerating script can't distinguish "code doesn't exist" from
  // "you're being rate limited."
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
  if (card.status === 'LOCKED') redirect('/card-disabled');

  if (card.status === 'ACTIVE' && card.profile_id) {

    // ── Owner check ──────────────────────────────────────────────────────────
    // If the tapping phone already has a PULSE login session belonging to
    // the card's owner, send them to their dashboard instead of the public
    // profile — and skip tap logging (owner checking their own card is not
    // a real visitor tap). Falls back to normal flow silently on any error.
    let isOwner = false;
    try {
      const supabaseServerAuth = await createSupabaseServerClient();
      const { data: { user } } = await supabaseServerAuth.auth.getUser();

      if (user?.email) {
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

    // ── Tap analytics ────────────────────────────────────────────────────────
    const city    = decodeURIComponent(h.get('x-vercel-ip-city')    || 'Unknown');
    const region  = decodeURIComponent(h.get('x-vercel-ip-region')  || 'Unknown');
    const country = h.get('x-vercel-ip-country') || 'PH';
    const tapIp   = h.get('x-forwarded-for')     || '127.0.0.1';
    const ua      = h.get('user-agent')           || '';

    await supabase.from('card_taps').insert({
      card_id:    card.id,
      profile_id: card.profile_id,
      ip_address: tapIp,
      city,
      region,
      country,
      user_agent: ua,
    });

    await supabase.rpc('increment_tap_count', { card_id: card.id });

    // ── Viewer session ───────────────────────────────────────────────────────
    // Create a short-lived viewer session server-side. The bearer token is
    // stored only in an HttpOnly cookie; it is never placed in the URL.
    const profileSlug = card.profiles?.slug;
    if (!profileSlug) redirect('/card-disabled');

    try {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + INACTIVITY_MINUTES * 60 * 1000).toISOString();

      const { error } = await supabaseAdmin.from('viewer_sessions').insert({
        token_hash: tokenHash,
        card_id: card.id,
        expires_at: expiresAt,
      });

      if (error) {
        console.error('[tap] viewer session creation failed:', error.message);
        redirect(`/p/${profileSlug}`);
      }

      const cookieStore = await cookies();
      cookieStore.set('pulse_viewer_session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: INACTIVITY_MINUTES * 60,
      });

      // Non-sensitive marker only: tells the client this navigation came
      // from a physical tap. The actual session credential stays in the cookie.
      redirect(`/p/${profileSlug}?session=1`);
    } catch (err) {
      console.error('[tap] viewer session creation failed:', err);
      redirect(`/p/${profileSlug}`);
    }
    redirect(destination);
  }

  redirect('/card-disabled');
}
