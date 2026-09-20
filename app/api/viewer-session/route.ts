// app/api/viewer-session/route.ts
//
// Viewer session management for NFC tap interactions.
//
// GET  ?vs=<token>  — validate session, re-check card status, refresh timer
// POST              — create a new viewer session (called by /t/[code])
//
// Security hierarchy:
//   Card status is the primary gate. If card becomes LOCKED or DEACTIVATED
//   while a session is active, this endpoint returns { active: false }
//   immediately on the next ping. The viewer session cannot override card status.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { randomBytes } from 'crypto';

const INACTIVITY_MINUTES = 30;

// ── GET — validate and refresh an existing session ─────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('vs');

  if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ active: false, reason: 'invalid_token' }, { status: 400 });
  }

  // 1. Look up session
  const { data: session } = await supabaseAdmin
    .from('viewer_sessions')
    .select('id, card_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ active: false, reason: 'not_found' });
  }

  // 2. Check expiry
  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ active: false, reason: 'expired' });
  }

  // 3. Re-check card status — card status always wins over session state.
  //    If the card became LOCKED or DEACTIVATED while someone was viewing,
  //    kill the session immediately.
  const { data: card } = await supabaseAdmin
    .from('hardware_cards')
    .select('status')
    .eq('id', session.card_id)
    .maybeSingle();

  if (!card || card.status !== 'ACTIVE') {
    return NextResponse.json({ active: false, reason: 'card_blocked' });
  }

  // 4. Refresh the timer — reset last_active and push expires_at forward
  const now = new Date();
  const newExpiry = new Date(now.getTime() + INACTIVITY_MINUTES * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('viewer_sessions')
    .update({ last_active: now.toISOString(), expires_at: newExpiry })
    .eq('id', session.id);

  return NextResponse.json({ active: true, expires_at: newExpiry });
}

// ── POST — create a new viewer session ─────────────────────────────────────
// Called server-side from /t/[code] after card status is confirmed ACTIVE.
// Not called from the browser directly.
export async function POST(request: Request) {
  const { card_id } = await request.json();

  if (!card_id) {
    return NextResponse.json({ error: 'card_id required' }, { status: 400 });
  }

  // Verify card is still ACTIVE before creating the session
  const { data: card } = await supabaseAdmin
    .from('hardware_cards')
    .select('id, status')
    .eq('id', card_id)
    .maybeSingle();

  if (!card || card.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Card is not active' }, { status: 409 });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INACTIVITY_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from('viewer_sessions').insert({
    token,
    card_id: card.id,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('[viewer-session POST]', error.message);
    return NextResponse.json({ error: 'Could not create session' }, { status: 500 });
  }

  return NextResponse.json({ token, expires_at: expiresAt });
}
