'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cardCode, setCardCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [profileType, setProfileType] = useState<'PROFESSIONAL' | 'PERSONAL'>('PROFESSIONAL');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.title = 'PULSE | Activate';
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCardCode(codeParam.toUpperCase().trim());
    }
  }, [searchParams]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardCode || !email || !slug || !fullName) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = cardCode.trim().toUpperCase();
      const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');

      const { data: card, error: cardError } = await supabase
        .from('hardware_cards')
        .select('*')
        .eq('card_code', cleanCode)
        .maybeSingle();

      if (cardError || !card) {
        throw new Error('Invalid Hardware Card Code. Please check the code printed on your pass.');
      }

      if (card.status === 'ACTIVE' && card.profile_id) {
        throw new Error('This card is already claimed and activated.');
      }

      let { data: account } = await supabase
        .from('accounts')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!account) {
        const { data: newAccount, error: accErr } = await supabase
          .from('accounts')
          .upsert({ email: cleanEmail }, { onConflict: 'email' })
          .select()
          .maybeSingle();

        if (accErr || !newAccount) throw new Error('Could not set up account record.');
        account = newAccount;
      }

      // Check if a profile for this specific type already exists for this account
      let { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_id', account.id)
        .eq('profile_type', profileType)
        .maybeSingle();

      let targetProfileId;

      if (existingProfile) {
        const { data: updatedProf, error: upErr } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            slug: cleanSlug,
            is_active: true,
          })
          .eq('id', existingProfile.id)
          .select()
          .single();

        if (upErr) {
          if (upErr.message.includes('slug')) {
            throw new Error('This profile slug is already taken. Please choose another one.');
          }
          throw upErr;
        }
        targetProfileId = updatedProf.id;
      } else {
        const { data: slugOwner } = await supabase
          .from('profiles')
          .select('id, account_id')
          .eq('slug', cleanSlug)
          .maybeSingle();

        if (slugOwner && slugOwner.account_id !== account.id) {
          throw new Error('This profile slug is already taken by another user.');
        }

        const { data: newProfile, error: profErr } = await supabase
          .from('profiles')
          .insert({
            account_id: account.id,
            email: cleanEmail,
            full_name: fullName,
            slug: cleanSlug,
            profile_type: profileType,
            is_active: true,
          })
          .select()
          .single();

        if (profErr) {
          if (profErr.message.includes('slug')) {
            throw new Error('This profile slug is already taken. Please choose another one.');
          }
          throw profErr;
        }
        targetProfileId = newProfile.id;
      }

      const { error: bindError } = await supabase
        .from('hardware_cards')
        .update({
          status: 'ACTIVE',
          profile_id: targetProfileId,
        })
        .eq('id', card.id);

      if (bindError) throw bindError;

      setMessage({
        type: 'success',
        text: `Hardware pass successfully linked to your ${profileType} profile! Redirecting...`,
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to activate hardware pass.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans selection:bg-neutral-800">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-amber-950/80 border border-amber-800/80 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-lg font-bold shadow-lg">
            ⚡
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Activate Hardware Pass</h1>
          <p className="text-xs font-semibold text-amber-400 tracking-wide">
            {profileType === 'PROFESSIONAL'
              ? 'Professional Unified Live Share Experience'
              : 'Personal Unified Live Share Experience'}
          </p>
          <p className="text-[11px] text-neutral-500">
            Pair your physical card to your digital identity.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed ${
              message.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : 'bg-red-950/50 border-red-800 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleActivate} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Hardware Card Code
            </label>
            <input
              type="text"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value.toUpperCase())}
              placeholder="E.G. CARD-9002"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Isaac Salasiban"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Card Profile Identity
            </label>
            <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1 border border-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => setProfileType('PROFESSIONAL')}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  profileType === 'PROFESSIONAL'
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                💼 Professional
              </button>
              <button
                type="button"
                onClick={() => setProfileType('PERSONAL')}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  profileType === 'PERSONAL'
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🌴 Personal
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Desired Profile Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="e.g. isaac-work"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
            <p className="text-[11px] text-neutral-500 mt-1">Your public URL will be: /p/{slug || 'your-slug'}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-lg disabled:opacity-50 mt-2"
          >
            {loading ? 'Activating Pass...' : 'Claim & Activate Hardware Pass'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 text-xs">Loading activation interface...</div>}>
      <ActivateContent />
    </Suspense>
  );
}