import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { randomUUID } from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { signedProfileMediaUrl } from '@/lib/profileMedia';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

async function getUserEmail(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await client.auth.getUser(token);
  return user?.email || null;
}

function hasValidMagic(bytes: Uint8Array, type: string): boolean {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.slice(0, 8).every((b, i) => b === [137,80,78,71,13,10,26,10][i]);
  if (type === 'image/gif') return String.fromCharCode(...bytes.slice(0, 6)) === 'GIF87a' || String.fromCharCode(...bytes.slice(0, 6)) === 'GIF89a';
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

export async function POST(request: Request) {
  // Rate-limit before parsing the multipart body.
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`upload:${ip}`, 20, 600);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const userEmail = await getUserEmail(request);
  if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const profileId = String(form.get('profileId') || '');
  const type = String(form.get('type') || '');
  const file = form.get('file');

  if (!profileId || !['avatar', 'banner', 'qr'].includes(type)) {
    return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'Image file required' }, { status: 400 });
  if (file.size < 1 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be between 1 byte and 5 MB' }, { status: 400 });
  }

  const ext = TYPES.get(file.type);
  if (!ext) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 415 });

  const { data: account } = await supabaseAdmin.from('accounts').select('id').eq('email', userEmail).maybeSingle();
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id').eq('id', profileId).eq('account_id', account.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidMagic(bytes, file.type)) {
    return NextResponse.json({ error: 'File contents do not match the declared image type' }, { status: 415 });
  }

  const path = `${profileId}/${type}-${randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from('profile-media')
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

  const mediaUrl = await signedProfileMediaUrl(path, 3600);
  return NextResponse.json({ publicUrl: mediaUrl });
}
