import { supabase } from '@/lib/supabase';
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
    // Geo data from Vercel edge headers
    const city    = decodeURIComponent(h.get('x-vercel-ip-city')    || 'Unknown');
    const region  = decodeURIComponent(h.get('x-vercel-ip-region')  || 'Unknown');
    const country = h.get('x-vercel-ip-country') || 'PH';
    const ip      = h.get('x-forwarded-for')     || '127.0.0.1';
    const ua      = h.get('user-agent')           || '';

    // Log the tap with full geo data
    await supabase.from('card_taps').insert({
      card_id:    card.id,
      profile_id: card.profile_id,
      ip_address: ip,
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
