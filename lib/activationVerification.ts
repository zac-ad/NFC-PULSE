import { randomBytes, createHash } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

const TOKEN_BYTES = 32;

export function generateVerificationToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token.trim(), 'utf8').digest('hex');
}

export interface IssueTokenResult {
  success: boolean;
  token?: string;
  tokenHash?: string;
  tokenId?: string;
  requestId?: string;
  email?: string;
  expiresAt?: string;
  error?: string;
}

export async function issueVerificationToken(
  requestId: string,
  expiresInMinutes = 30
): Promise<IssueTokenResult> {
  const token = generateVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin.rpc('issue_activation_verification_token', {
    p_request_id: requestId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });

  if (error) {
    console.error('Failed to issue verification token:', error.message);
    return { success: false, error: 'Could not generate verification token.' };
  }

  const result = data as {
    success?: boolean;
    token_id?: string;
    request_id?: string;
    email?: string;
    expires_at?: string;
    error?: string;
  };

  if (!result?.success) {
    return { success: false, error: result?.error || 'Could not issue verification token.' };
  }

  return {
    success: true,
    token,
    tokenHash,
    tokenId: result.token_id,
    requestId: result.request_id,
    email: result.email,
    expiresAt: result.expires_at,
  };
}

export interface ConsumeTokenResult {
  success: boolean;
  requestId?: string;
  email?: string;
  slug?: string;
  profileType?: string;
  fullName?: string;
  error?: string;
}

export async function consumeVerificationToken(
  rawToken: string
): Promise<ConsumeTokenResult> {
  const clean = rawToken.trim();
  if (!clean || clean.length < 20 || clean.length > 256) {
    return { success: false, error: 'Invalid or malformed verification token.' };
  }

  const tokenHash = hashVerificationToken(clean);

  const { data, error } = await supabaseAdmin.rpc('consume_activation_verification_token', {
    p_token_hash: tokenHash,
  });

  if (error) {
    console.error('Failed to consume verification token:', error.message);
    return { success: false, error: 'Could not verify token. Please try again.' };
  }

  const result = data as {
    success?: boolean;
    request_id?: string;
    email?: string;
    slug?: string;
    profile_type?: string;
    full_name?: string;
    error?: string;
  };

  if (!result?.success) {
    return { success: false, error: result?.error || 'Verification failed.' };
  }

  return {
    success: true,
    requestId: result.request_id,
    email: result.email,
    slug: result.slug,
    profileType: result.profile_type,
    fullName: result.full_name,
  };
}
