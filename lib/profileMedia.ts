import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const PROFILE_MEDIA_BUCKET = 'profile-media';
const PUBLIC_MARKER = `/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/`;
const SIGNED_MARKER = `/storage/v1/object/sign/${PROFILE_MEDIA_BUCKET}/`;

export function getProfileMediaPath(value: string | null | undefined): string | null {
  if (!value) return null;

  let raw = value.trim();
  if (!raw) return null;

  const publicIndex = raw.indexOf(PUBLIC_MARKER);
  const signedIndex = raw.indexOf(SIGNED_MARKER);

  if (publicIndex >= 0) {
    raw = raw.slice(publicIndex + PUBLIC_MARKER.length).split('?')[0];
  } else if (signedIndex >= 0) {
    raw = raw.slice(signedIndex + SIGNED_MARKER.length).split('?')[0];
  }

  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }

  if (!raw || raw.startsWith('/') || raw.includes('..') || raw.includes('\\')) {
    return null;
  }

  return raw;
}

export function canonicalProfileMediaUrl(value: string | null | undefined): string {
  const path = getProfileMediaPath(value);
  if (!path) return value?.trim() || '';

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');

  return `${base}/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function signedProfileMediaUrl(
  value: string | null | undefined,
  expiresIn = 3600
): Promise<string> {
  if (!value) return '';

  const path = getProfileMediaPath(value);
  if (!path) return value;

  const { data, error } = await supabaseAdmin.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Unable to create signed media URL.');
  }

  return data.signedUrl;
}
