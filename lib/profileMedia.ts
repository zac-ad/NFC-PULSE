import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const PROFILE_MEDIA_BUCKET = 'profile-media';

function getSupabaseStorageUrl(value: string): URL | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(base).origin;
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is invalid.');
  }

  if (parsed.origin !== expectedOrigin) return null;

  const publicPrefix = `/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/`;
  const signedPrefix = `/storage/v1/object/sign/${PROFILE_MEDIA_BUCKET}/`;

  if (!parsed.pathname.startsWith(publicPrefix) && !parsed.pathname.startsWith(signedPrefix)) {
    return null;
  }

  return parsed;
}

export function getProfileMediaPath(value: string | null | undefined): string | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  const parsed = getSupabaseStorageUrl(raw);
  if (!parsed) return null;

  const publicPrefix = `/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/`;
  const signedPrefix = `/storage/v1/object/sign/${PROFILE_MEDIA_BUCKET}/`;
  const prefix = parsed.pathname.startsWith(publicPrefix) ? publicPrefix : signedPrefix;

  let path = parsed.pathname.slice(prefix.length);

  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }

  if (!path || path.startsWith('/') || path.includes('..') || path.includes('\\')) {
    return null;
  }

  return path;
}

export function canonicalProfileMediaUrl(value: string | null | undefined): string {
  if (!value?.trim()) return '';

  const path = getProfileMediaPath(value);
  if (!path) throw new Error('Invalid profile media URL.');

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');

  return `${base}/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function signedProfileMediaUrl(
  value: string | null | undefined,
  expiresIn = 3600
): Promise<string> {
  if (!value?.trim()) return '';

  const path = getProfileMediaPath(value);
  if (!path) throw new Error('Invalid profile media URL.');

  const { data, error } = await supabaseAdmin.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Unable to create signed media URL.');
  }

  return data.signedUrl;
}
