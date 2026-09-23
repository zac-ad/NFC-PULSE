import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServerAuth';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createHash, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const INACTIVITY_MINUTES = 30;

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const h = await headers();
  const resolvedParams = await params;
  const cardCode = resolvedParams.code?.trim().toUpperCase();

  if (!cardCode) return NextResponse.redirect(new URL('/card-disabled', request.url));

  // Rate limit: 20 taps per client IP per minute.
  // Use the shared client-IP parser so this route cannot accidentally diverge
  // from the other protected endpoints.
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`tap:${ip}`, 20, 60);
  if (!allowed) return NextResponse.redirect(new URL('/card-disabled', request.url));

  const { data: card } = await supabaseAdmin
    .from('hardware_cards')
    .select('*, profiles(*)')
    .eq('card_code', cardCode)
    .single();

  if (!card || card.status === 'UNCLAIMED') return NextResponse.redirect(new URL(`/activate?code=${cardCode}`, request.url));
  if (card.status === 'DEACTIVATED') return NextResponse.redirect(new URL('/card-disabled', request.url));
  if (card.status === 'LOCKED') return NextResponse.redirect(new URL('/card-disabled', request.url));

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

    if (isOwner) return NextResponse.redirect(new URL('/dashboard', request.url));

    // ── Tap analytics ────────────────────────────────────────────────────────
    const city    = decodeURIComponent(h.get('x-vercel-ip-city')    || 'Unknown');
    const region  = decodeURIComponent(h.get('x-vercel-ip-region')  || 'Unknown');
    const country = h.get('x-vercel-ip-country') || 'PH';
    const tapIp   = ip;
    const ua      = h.get('user-agent') || '';

    await supabaseAdmin.from('card_taps').insert({
      card_id:    card.id,
      profile_id: card.profile_id,
      ip_address: tapIp,
      city,
      region,
      country,
      user_agent: ua,
    });

    await supabaseAdmin.rpc('increment_tap_count', { card_id: card.id });

    // ── Viewer session ───────────────────────────────────────────────────────
    // Create a short-lived viewer session server-side. The bearer token is
    // stored only in an HttpOnly cookie; it is never placed in the URL.
    const profileSlug = card.profiles?.slug;
    if (!profileSlug) return NextResponse.redirect(new URL('/card-disabled', request.url));

    let viewerToken: string | null = null;
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
      } else {
        viewerToken = token;
      }
    } catch (err) {
      console.error('[tap] viewer session creation failed:', err);
    }

    if (!viewerToken) return NextResponse.redirect(new URL(`/p/${profileSlug}`, request.url));

    // Set the bearer credential only on the redirect response. This route is a
    // Route Handler so the HttpOnly cookie is set in a supported response boundary.
    const response = NextResponse.redirect(new URL(`/p/${profileSlug}?session=1`, request.url));
    response.cookies.set('__Host-pulse_viewer_session', viewerToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: INACTIVITY_MINUTES * 60,
    });
    return response;
  }

  return NextResponse.redirect(new URL('/card-disabled', request.url));
}
