// lib/rateLimit.ts
//
// Database-backed rate limiting. If the limiter cannot be verified,
// protected endpoints fail closed instead of becoming unlimited.
//
// Vercel calculates the client IP at its proxy layer and exposes it
// through x-real-ip. Prefer that trusted value over x-forwarded-for.
// x-forwarded-for remains a fallback for local/non-Vercel execution.

import { supabaseAdmin } from './supabaseAdmin';

export async function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error('Rate limit check failed:', error.message);
    return false;
  }

  return data === true;
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0].trim();
  return ip || 'unknown';
}
