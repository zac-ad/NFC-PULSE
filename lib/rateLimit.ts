// lib/rateLimit.ts
//
// Wraps the check_rate_limit Postgres function (see
// supabase/migrations/0002_rate_limits_and_audit_log.sql). The actual
// counting happens atomically in the database via a row lock, so this
// works correctly even across multiple serverless function instances —
// a plain in-memory counter would NOT work here, since Vercel can route
// two requests from the same IP to two different instances that don't
// share memory.

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
    // Fail open rather than lock everyone out if the rate-limit table
    // itself has a problem — availability over strictness here.
    console.error('Rate limit check failed:', error.message);
    return true;
  }
  return data === true;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || 'unknown';
}
