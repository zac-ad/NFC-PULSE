import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, title, company, phone, email, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.full_name || ''}`,
    profile.title ? `TITLE:${profile.title}` : '',
    profile.company ? `ORG:${profile.company}` : '',
    profile.phone ? `TEL:${profile.phone}` : '',
    profile.email ? `EMAIL:${profile.email}` : '',
    `URL:${new URL(request.url).origin}/p/${profile.slug}`,
    'END:VCARD',
  ].filter(Boolean).join('\r\n');

  const ua = request.headers.get('user-agent') || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  return new NextResponse(vcardLines, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `${isIOS ? 'inline' : 'attachment'}; filename="${slug}.vcf"`,
    },
  });
}
