// app/api/activate/route.ts
//
// All of card activation's writes (accounts, profiles, hardware_cards)
// happen here with the service-role key, not the client.
//
// Why this has to be server-side: activation happens BEFORE the person
// has ever logged in — there's no session yet for RLS's
// `account_id = auth.uid()` checks to compare against. The old version
// of this page wrote directly from the browser with the anon key, which
// worked back when RLS was looser, but broke the moment RLS was
// tightened for the dashboard. Using the service-role key here sidesteps
// that entirely, with validation done in this route instead of relying
// on RLS to catch mistakes.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { cardCode, fullName, email, slug, profileType, consent } = await request.json();

  if (!cardCode || !fullName || !email || !slug || !profileType) {
    return NextResponse.json({ error: 'Please fill in all fields.' }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json(
      { error: 'Please agree to the Terms and Privacy Policy to continue.' },
      { status: 400 }
    );
  }
  if (profileType !== 'PROFESSIONAL' && profileType !== 'PERSONAL') {
    return NextResponse.json({ error: 'Invalid profile type.' }, { status: 400 });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode  = String(cardCode).trim().toUpperCase();
  const cleanSlug  = String(slug).trim().toLowerCase().replace(/\s+/g, '-');

  // 1. Card must exist AND be unclaimed.
  const { data: card } = await supabaseAdmin
    .from('hardware_cards')
    .select('id, status')
    .eq('card_code', cleanCode)
    .maybeSingle();

  if (!card) {
    return NextResponse.json(
      { error: "We couldn't find that card. Check the code printed on your card and try again." },
      { status: 404 }
    );
  }
  if (card.status !== 'UNCLAIMED') {
    return NextResponse.json(
      { error: 'This card has already been activated or is no longer available.' },
      { status: 409 }
    );
  }

  // 2. Find or create the account.
  let { data: account } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (!account) {
    const { data: newAccount, error: accErr } = await supabaseAdmin
      .from('accounts')
      .insert({ email: cleanEmail })
      .select('id')
      .single();
    if (accErr || !newAccount) {
      return NextResponse.json({ error: 'Could not set up your account. Please try again.' }, { status: 500 });
    }
    account = newAccount;
  }

  // 3. Find or create the profile for this account + profile type.
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('account_id', account.id)
    .eq('profile_type', profileType)
    .maybeSingle();

  let targetProfileId: string;

  if (existingProfile) {
    const { data: updated, error: upErr } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, slug: cleanSlug, is_active: true })
      .eq('id', existingProfile.id)
      .select('id')
      .single();
    if (upErr) {
      const msg = upErr.message.includes('slug')
        ? `That PULSE link is already taken. Try a different one.`
        : 'Could not update your profile. Please try again.';
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    targetProfileId = updated.id;
  } else {
    const { data: slugOwner } = await supabaseAdmin
      .from('profiles')
      .select('id, account_id')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (slugOwner && slugOwner.account_id !== account.id) {
      return NextResponse.json(
        { error: 'That PULSE link is already taken. Try a different one.' },
        { status: 409 }
      );
    }

    const { data: newProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        account_id:   account.id,
        email:        cleanEmail,
        full_name:    fullName,
        slug:         cleanSlug,
        profile_type: profileType,
        is_active:    true,
      })
      .select('id')
      .single();

    if (profErr || !newProfile) {
      const msg = profErr?.message.includes('slug')
        ? 'That PULSE link is already taken. Try a different one.'
        : 'Could not create your profile. Please try again.';
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    targetProfileId = newProfile.id;
  }

  // 4. Bind the card — the `.eq('status', 'UNCLAIMED')` guard means if two
  //    people submit the same code at the same instant, only the first wins.
  const { data: bound, error: bindError } = await supabaseAdmin
    .from('hardware_cards')
    .update({ status: 'ACTIVE', profile_id: targetProfileId })
    .eq('id', card.id)
    .eq('status', 'UNCLAIMED')
    .select('id')
    .maybeSingle();

  if (bindError) {
    return NextResponse.json({ error: 'Could not activate your card. Please try again.' }, { status: 500 });
  }
  if (!bound) {
    return NextResponse.json(
      { error: 'This card was just claimed by someone else. Please contact support.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, slug: cleanSlug });
}
