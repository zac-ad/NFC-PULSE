// app/api/viewer-session/route.ts
//
// Viewer session management for NFC tap interactions.
//
// GET  — validate the HttpOnly viewer session cookie, re-check card status, refresh timer
// POST — intentionally disabled; sessions are created only inside /t/[code]
//
// Security hierarchy:
//   Card status is the primary gate. If card becomes LOCKED or DEACTIVATED
//   while a session is active, this endpoint returns { active: false }
//   immediately on the next ping. The viewer session cannot override card status.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';

const INACTIVITY_MINUTES = 30;

// ── GET — validate and refresh an existing session ─────────────────────────
export async function GET(request: Request) {
  // The viewer credential is an HttpOnly cookie. It is intentionally not
  // accepted from the URL or request body.
  const cookieStore = await cookies();
  const token = cookieStore.get('pulse_viewer_session')?.value;

  if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ active: false, reason: 'invalid_session' }, { status: 401 });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  // 1. Look up session
  const { data: session, error: lookupError } = await supabaseAdmin
    .from('viewer_sessions')
    .select('id, card_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (lookupError) {
    console.error('[viewer-session GET] session lookup failed:', lookupError.message);
    // Fail closed: if the session cannot be verified, do not trust it.
    return NextResponse.json({ active: false, reason: 'verification_failed' }, { status: 503 });
  }

  if (!session) {
    return NextResponse.json({ active: false, reason: 'not_found' });
  }

  // 2. Check expiry
  if (new Date(session.expires_at) <= new Date()) {
    return NextResponse.json({ active: false, reason: 'expired' });
  }

  // 3. Re-check card status — card status always wins over session state.
  const { data: card, error: cardError } = await supabaseAdmin
    .from('hardware_cards')
    .select('status')
    .eq('id', session.card_id)
    .maybeSingle();

  if (cardError) {
    console.error('[viewer-session GET] card status lookup failed:', cardError.message);
    // Fail closed: an unverified card must not keep an active viewer session.
    return NextResponse.json({ active: false, reason: 'verification_failed' }, { status: 503 });
  }

  if (!card || card.status !== 'ACTIVE') {
    await supabaseAdmin.from('viewer_sessions').delete().eq('id', session.id);
    return NextResponse.json({ active: false, reason: 'card_blocked' });
  }

  // 4. Refresh the inactivity timer.
  const now = new Date();
  const newExpiry = new Date(now.getTime() + INACTIVITY_MINUTES * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('viewer_sessions')
    .update({ last_active: now.toISOString(), expires_at: newExpiry })
    .eq('id', session.id);

  if (updateError) {
    console.error('[viewer-session GET] timer refresh failed:', updateError.message);
    // Do not extend a session we failed to persist. Return its existing expiry.
    return NextResponse.json({ active: true, expires_at: session.expires_at });
  }

  // Keep the browser cookie aligned with the inactivity window.
  cookieStore.set('pulse_viewer_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: INACTIVITY_MINUTES * 60,
  });

  return NextResponse.json({ active: true, expires_at: newExpiry });
}

// ── POST ─────────────────────────────────────────────────────────────────────
// Session creation is intentionally server-only in /t/[code]. There is no
// public POST endpoint that accepts a card_id or creates viewer credentials.
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
