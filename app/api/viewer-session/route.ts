// app/api/viewer-session/route.ts
// Viewer session management for NFC tap interactions.
//
// GET validates the HttpOnly viewer session cookie, re-checks card status, and refreshes the timer.
// POST is intentionally disabled; sessions are created only inside /t/[code].

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';

const INACTIVITY_MINUTES = 30;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('__Host-pulse_viewer_session')?.value;

  if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
    const response = noStoreJson({ active: false, reason: 'invalid_session' }, { status: 401 });
    response.cookies.delete('__Host-pulse_viewer_session');
    return response;
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: session, error: lookupError } = await supabaseAdmin
    .from('viewer_sessions')
    .select('id, card_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (lookupError) {
    console.error('[viewer-session GET] session lookup failed:', lookupError.message);
    return noStoreJson({ active: false, reason: 'verification_failed' }, { status: 503 });
  }

  if (!session) {
    const response = noStoreJson({ active: false, reason: 'not_found' });
    response.cookies.delete('__Host-pulse_viewer_session');
    return response;
  }

  if (new Date(session.expires_at) <= new Date()) {
    await supabaseAdmin.from('viewer_sessions').delete().eq('id', session.id);
    const response = noStoreJson({ active: false, reason: 'expired' });
    response.cookies.delete('__Host-pulse_viewer_session');
    return response;
  }

  const { data: card, error: cardError } = await supabaseAdmin
    .from('hardware_cards')
    .select('status')
    .eq('id', session.card_id)
    .maybeSingle();

  if (cardError) {
    console.error('[viewer-session GET] card status lookup failed:', cardError.message);
    return noStoreJson({ active: false, reason: 'verification_failed' }, { status: 503 });
  }

  if (!card || card.status !== 'ACTIVE') {
    await supabaseAdmin.from('viewer_sessions').delete().eq('id', session.id);
    const response = noStoreJson({ active: false, reason: 'card_blocked' });
    response.cookies.delete('__Host-pulse_viewer_session');
    return response;
  }

  const now = new Date();
  const newExpiry = new Date(now.getTime() + INACTIVITY_MINUTES * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('viewer_sessions')
    .update({ last_active: now.toISOString(), expires_at: newExpiry })
    .eq('id', session.id);

  if (updateError) {
    console.error('[viewer-session GET] timer refresh failed:', updateError.message);
    return noStoreJson({ active: true, expires_at: session.expires_at });
  }

  cookieStore.set('__Host-pulse_viewer_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: INACTIVITY_MINUTES * 60,
  });

  return noStoreJson({ active: true, expires_at: newExpiry });
}

export async function POST() {
  return noStoreJson({ error: 'Method not allowed' }, { status: 405 });
}
