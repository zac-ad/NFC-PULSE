import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SESSION_COOKIE = '__Host-pulse_viewer_session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: 'A PULSE connection is required.' }, { status: 403 });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('viewer_sessions')
    .select('id, card_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (sessionError) {
    console.error('[vcard] viewer session lookup failed:', sessionError.message);
    return NextResponse.json({ error: 'Unable to verify connection.' }, { status: 503 });
  }

  if (!session || new Date(session.expires_at) <= new Date()) {
    return NextResponse.json({ error: 'Your PULSE connection has ended.' }, { status: 403 });
  }

  const { data: card, error: cardError } = await supabaseAdmin
    .from('hardware_cards')
    .select('status, profile_id')
    .eq('id', session.card_id)
    .maybeSingle();

  if (cardError) {
    console.error('[vcard] card lookup failed:', cardError.message);
    return NextResponse.json({ error: 'Unable to verify connection.' }, { status: 503 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, title, company, phone, email, slug, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (profileError) {
    console.error('[vcard] profile lookup failed:', profileError.message);
    return NextResponse.json({ error: 'Unable to load contact.' }, { status: 503 });
  }

  if (!profile || !card || card.status !== 'ACTIVE' || card.profile_id !== profile.id) {
    return NextResponse.json({ error: 'A PULSE connection is required.' }, { status: 403 });
  }

  const escapeVCard = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(profile.full_name || '')}`,
    profile.title ? `TITLE:${escapeVCard(profile.title)}` : '',
    profile.company ? `ORG:${escapeVCard(profile.company)}` : '',
    profile.phone ? `TEL:${escapeVCard(profile.phone)}` : '',
    profile.email ? `EMAIL:${escapeVCard(profile.email)}` : '',
    `URL:${new URL(request.url).origin}/p/${profile.slug}`,
    'END:VCARD',
  ].filter(Boolean).join('\r\n');

  const ua = request.headers.get('user-agent') || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  return new NextResponse(vcardLines, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `${isIOS ? 'inline' : 'attachment'}; filename="${slug}.vcf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
