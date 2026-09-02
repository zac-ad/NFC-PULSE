'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ActivationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get('code') || '';

  const [cardCode, setCardCode] = useState(initialCode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.title = 'Activate Hardware Pass | PULSE';
    if (initialCode) {
      setCardCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formattedCode = cardCode.trim().toUpperCase();
    const formattedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');

    try {
      // 1. Verify Card Exists & Is UNCLAIMED
      const { data: card, error: cardError } = await supabase
        .from('hardware_cards')
        .select('*')
        .eq('card_code', formattedCode)
        .single();

      if (cardError || !card) {
        throw new Error('Invalid hardware code. Please verify the code on your pass.');
      }

      if (card.status === 'ACTIVE') {
        throw new Error('This hardware card has already been claimed and activated.');
      }

      // 2. Upsert User Profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim())
        .single();

      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            full_name: fullName,
            email: email.trim(),
            slug: formattedSlug,
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        profile = newProfile;
      }

      // 3. Link Card to Profile & Mark ACTIVE
      const { error: linkError } = await supabase
        .from('hardware_cards')
        .update({
          status: 'ACTIVE',
          profile_id: profile.id,
        })
        .eq('id', card.id);

      if (linkError) throw linkError;

      // 4. Trigger Automated Activation Email
      await fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          fullName,
          cardCode: formattedCode,
          slug: profile.slug || formattedSlug,
        }),
      });

      setMessage({
        type: 'success',
        text: `Hardware Pass ${formattedCode} successfully claimed! Activation email sent to ${email}.`,
      });

      setTimeout(() => {
        router.push(`/p/${profile.slug || formattedSlug}`);
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Activation failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 flex items-center justify-center font-sans">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-xl">
            ⚡
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Activate Hardware Pass</h1>
          <p className="text-xs text-neutral-400">Pair your physical PULSE card to your digital identity.</p>
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

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Hardware Card Code
            </label>
            <input
              type="text"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              placeholder="e.g. CARD-9002"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Isaac Salasiban"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Desired Profile Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. isaac"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
            />
            <p className="text-[10px] text-neutral-500 mt-1">Your public URL will be: /p/{slug || 'your-slug'}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-white text-black font-bold text-sm rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Pairing Pass...' : 'Claim & Activate Hardware Pass'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-xs text-neutral-500 animate-pulse">Loading activation setup...</p>
      </main>
    }>
      <ActivationContent />
    </Suspense>
  );
}