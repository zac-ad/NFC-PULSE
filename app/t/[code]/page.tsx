import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

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

    // Increment tap_count on the card row — this is what the dashboard displays
    await supabase
      .from('hardware_cards')
      .update({ tap_count: (card.tap_count || 0) + 1 })
      .eq('id', card.id);

    const profileSlug = card.profiles?.slug;
    if (profileSlug) redirect(`/p/${profileSlug}`);
  }

  redirect('/card-disabled');
}
