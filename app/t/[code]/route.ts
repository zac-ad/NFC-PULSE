import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // 1. Fetch physical card record & associated profile slug
  const { data: card, error } = await supabase
    .from('hardware_cards')
    .select('*, profiles(slug)')
    .eq('card_code', code)
    .single();

  if (error || !card) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // 2. UNCLAIMED -> Send to activation screen with prefilled code
  if (card.status === 'UNCLAIMED' || !card.profile_id) {
    return NextResponse.redirect(new URL(`/activate?code=${code}`, request.url));
  }

  // 3. DEACTIVATED -> Block access with boundary screen
  if (card.status === 'DEACTIVATED') {
    return NextResponse.redirect(new URL('/card-disabled', request.url));
  }

  // 4. ACTIVE -> Log tap analytics & forward to live profile
  const profileSlug = (card.profiles as { slug: string } | null)?.slug;
  if (!profileSlug) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Asynchronous telemetry insert
  await supabase.from('card_taps').insert({
    card_code: code,
    profile_id: card.profile_id,
    ip_address: clientIp,
    user_agent: userAgent,
  });

  // 5. Generate dynamic expiring URL session token
  const sessionToken = Buffer.from(`pulse_${Date.now()}_${code}`).toString('base64url');

  return NextResponse.redirect(
    new URL(`/p/${profileSlug}?token=${sessionToken}`, request.url)
  );
}