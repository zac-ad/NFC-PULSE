import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug?.toLowerCase();

  if (!slug) {
    return new NextResponse('Profile slug missing', { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !profile) {
    return new NextResponse('Profile not found', { status: 404 });
  }

  // Construct standard vCard 3.0 string
  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.full_name || ''}`,
    `N:;${profile.full_name || ''};;;`,
    profile.title ? `TITLE:${profile.title}` : '',
    profile.company ? `ORG:${profile.company}` : '',
    profile.email ? `EMAIL;TYPE=INTERNET:${profile.email}` : '',
    profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : '',
    profile.bio ? `NOTE:${profile.bio.replace(/\n/g, '\\n')}` : '',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');

  return new NextResponse(vcardLines, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.vcf"`,
    },
  });
}