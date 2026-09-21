import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type RouteContext = { params: Promise<{ slug: string }> };

const SESSION_COOKIE = '__Host-pulse_viewer_session';

function publicProfile(profile: Record<string, unknown>) {
  return {
    id: profile.id,
    full_name: profile.full_name,
    title: profile.title,
    company: profile.company,
    bio: profile.bio,
    slug: profile.slug,
    avatar_url: profile.avatar_url,
    banner_url: profile.banner_url,
    is_active: profile.is_active,
    profile_type: profile.profile_type,
    // Private contact fields are deliberately omitted unless connected.
    phone: '',
    email: '',
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;

  if (!slug || slug.length > 120) {
    return NextResponse.json({ profile: null, links: [], connected: false }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, title, company, bio, phone, email, slug, avatar_url, banner_url, is_active, profile_type')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (profileError) {
    console.error('[profile-view] profile lookup failed:', profileError.message);
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 503 });
  }

  if (!profile) {
    return NextResponse.json({ profile: null, links: [], connected: false }, { status: 404 });
  }

  // Public layer: social/general links only. QR/payment links are private.
  const { data: publicLinks, error: linksError } = await supabaseAdmin
    .from('profile_links')
    .select('id, title, url, type')
    .eq('profile_id', profile.id)
    .eq('visibility', 'public')
    .neq('type', 'qr')
    .order('position', { ascending: true });

  if (linksError) {
    console.error('[profile-view] public links lookup failed:', linksError.message);
    return NextResponse.json({ error: 'Unable to load profile links' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({
      profile: publicProfile(profile),
      links: publicLinks || [],
      connected: false,
    });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('viewer_sessions')
    .select('id, card_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (sessionError) {
    console.error('[profile-view] viewer session lookup failed:', sessionError.message);
    return NextResponse.json({
      profile: publicProfile(profile),
      links: publicLinks || [],
      connected: false,
    });
  }

  if (!session || new Date(session.expires_at) <= new Date()) {
    return NextResponse.json({
      profile: publicProfile(profile),
      links: publicLinks || [],
      connected: false,
    });
  }

  const { data: card, error: cardError } = await supabaseAdmin
    .from('hardware_cards')
    .select('status, profile_id')
    .eq('id', session.card_id)
    .maybeSingle();

  if (cardError) {
    console.error('[profile-view] viewer card lookup failed:', cardError.message);
    return NextResponse.json({
      profile: publicProfile(profile),
      links: publicLinks || [],
      connected: false,
    });
  }

  // A session can only unlock the profile attached to the card that created it.
  if (!card || card.status !== 'ACTIVE' || card.profile_id !== profile.id) {
    return NextResponse.json({
      profile: publicProfile(profile),
      links: publicLinks || [],
      connected: false,
    });
  }

  const { data: privateLinks, error: privateLinksError } = await supabaseAdmin
    .from('profile_links')
    .select('id, title, url, type, visibility')
    .eq('profile_id', profile.id)
    .eq('visibility', 'tap')
    .order('position', { ascending: true });

  if (privateLinksError) {
    console.error('[profile-view] connected links lookup failed:', privateLinksError.message);
    return NextResponse.json({
      profile: publicProfile(profile),
      links: publicLinks || [],
      connected: false,
    });
  }

  return NextResponse.json({
    profile: {
      ...publicProfile(profile),
      phone: profile.phone || '',
      email: profile.email || '',
    },
    links: [...(publicLinks || []), ...(privateLinks || [])],
    connected: true,
  });
}
