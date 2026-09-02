'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cardCode, setCardCode] = useState('');
  const [activationKey, setActivationKey] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setCardCode(code);
  }, [searchParams]);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Verify card exists and is unclaimed
      const { data: card, error: cardError } = await supabase
        .from('hardware_cards')
        .select('*')
        .eq('card_code', cardCode)
        .eq('status', 'UNCLAIMED')
        .single();

      if (cardError || !card) {
        throw new Error('Invalid or already activated card code.');
      }

      // 2. Fetch profile matching email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, slug')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        throw new Error('No profile found with this email. Please register first.');
      }

      // 3. Update hardware status to ACTIVE and attach profile_id
      const { error: updateError } = await supabase
        .from('hardware_cards')
        .update({
          profile_id: profile.id,
          status: 'ACTIVE',
          activated_at: new Date().toISOString(),
        })
        .eq('card_code', cardCode);

      if (updateError) throw updateError;

      setSuccessMsg('Card activated successfully! Redirecting to profile...');
      setTimeout(() => {
        router.push(`/p/${profile.slug}`);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Activation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-widest text-white">PULSE</h1>
          <p className="text-neutral-400 text-sm mt-1">Hardware Card Activation</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg text-emerald-300 text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleActivation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Hardware Code
            </label>
            <input
              type="text"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              placeholder="e.g. CARD-8821"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Account Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              6-Digit Activation Key
            </label>
            <input
              type="text"
              maxLength={6}
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              placeholder="123456"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white tracking-widest text-center text-lg font-mono focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors mt-6 disabled:opacity-50"
          >
            {loading ? 'Activating...' : 'Pair Card to Profile'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ActivateContent />
    </Suspense>
  );
}