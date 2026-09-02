import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function TapRouterPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cardCode = resolvedParams.code?.trim().toUpperCase();

  if (!cardCode) {
    redirect('/card-disabled');
  }

  // Fetch hardware card status & linked profile
  const { data: card } = await supabase
    .from('hardware_cards')
    .select('*, profiles(*)')
    .eq('card_code', cardCode)
    .single();

  // 1. Unclaimed Card -> Activation Flow
  if (!card || card.status === 'UNCLAIMED') {
    redirect(`/activate?code=${cardCode}`);
  }

  // 2. Hardware Deactivated -> Card Disabled Screen
  if (card.status === 'DEACTIVATED') {
    redirect('/card-disabled');
  }

  // 3. Active Card -> Log Telemetry and Route to Public Profile
  if (card.status === 'ACTIVE' && card.profile_id) {
    await supabase.from('card_taps').insert({
      card_id: card.id,
      profile_id: card.profile_id,
    });

    const profileSlug = card.profiles?.slug;
    if (profileSlug) {
      redirect(`/p/${profileSlug}`);
    }
  }

  redirect('/card-disabled');
}