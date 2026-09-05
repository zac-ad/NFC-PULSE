import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const resolvedParams = await params;
  const cardCode = resolvedParams.code?.toUpperCase().trim();

  if (!cardCode) {
    return new NextResponse('Card code missing', { status: 400 });
  }

  // 1. Extract Vercel Geo headers automatically
  const headers = request.headers;
  const city = decodeURIComponent(headers.get('x-vercel-ip-city') || 'Unknown City');
  const region = decodeURIComponent(headers.get('x-vercel-ip-region') || 'Unknown Region');
  const country = headers.get('x-vercel-ip-country') || 'PH';
  const ip = headers.get('x-forwarded-for') || '127.0.0.1';

  // 2. Find the hardware card and its linked profile
  const { data: card, error: cardError } = await supabase
    .from('hardware_cards')
    .select('*, profiles(slug, is_active)')
    .eq('card_code', cardCode)
    .maybeSingle();

  if (cardError || !card || !card.profiles) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // 3. Log the tap telemetry with geo-tagging data
  await supabase.from('card_taps').insert({
    card_id: card.id,
    profile_id: card.profile_id,
    ip_address: ip,
    city: city,
    region: region,
    country: country,
  });

  // 4. Redirect visitor to the owner's public profile page
  const profileSlug = (card.profiles as any).slug;
  return NextResponse.redirect(new URL(`/p/${profileSlug}`, request.url));
}