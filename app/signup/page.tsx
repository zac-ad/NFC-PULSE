'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function SignUpForm() {
  const searchParams = useSearchParams();
  const preset = (searchParams.get('preset')?.toUpperCase() as 'PROFESSIONAL' | 'PERSONAL') || 'PROFESSIONAL';
  const isPro = preset === 'PROFESSIONAL';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'PULSE | Create Account'; }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard?preset=${preset}`
          : undefined,
      },
    });
    if (err) { setError(err.message); } else { setSent(true); }
    setLoading(false);
  };

  return (
    <div className={`w-full max-w-sm space-y-8 ${!isPro ? 'text-black' : ''}`}>
      <div>
        <Link
          href="/onboarding"
          className={`text-[12px] transition-colors ${isPro ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'}`}
        >
          ← Back
        </Link>
        <h1 className={`font-serif text-3xl mt-6 ${isPro ? 'text-white' : 'text-black'}`}>
          {isPro ? 'Professional identity.' : 'Personal identity.'}
        </h1>
        <p className={`text-[14px] mt-2 ${isPro ? 'text-white/40' : 'text-black/40'}`}>
          We&rsquo;ll send an activation link to your email.
        </p>
      </div>

      {sent ? (
        <div className={`p-5 rounded-2xl border space-y-2 ${
          isPro ? 'bg-[#141414] border-white/10' : 'bg-white border-black/10'
        }`}>
          <p className={`font-serif text-base ${isPro ? 'text-white' : 'text-black'}`}>Link sent.</p>
          <p className={`text-[13px] leading-relaxed ${isPro ? 'text-white/40' : 'text-black/40'}`}>
            Check <span className={isPro ? 'text-white/70' : 'text-black/70'}>{email}</span> to activate your profile.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            className={`w-full rounded-xl px-4 py-3.5 text-[14px] focus:outline-none ${
              isPro
                ? 'bg-[#141414] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20'
                : 'bg-white border border-black/[0.08] text-black placeholder:text-black/25 focus:border-black/20'
            }`}
          />
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-40 ${
              isPro
                ? 'bg-white text-black hover:bg-[#f2f0eb]'
                : 'bg-black text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {loading ? 'Sending…' : 'Continue with email'}
          </button>
        </form>
      )}

      <p className={`text-[12px] text-center ${isPro ? 'text-white/20' : 'text-black/30'}`}>
        Already have an account?{' '}
        <Link
          href={isPro ? '/portal/professional/login' : '/portal/personal/login'}
          className={`border-b pb-px transition-colors ${
            isPro ? 'text-white/50 border-white/20 hover:text-white' : 'text-black/60 border-black/20 hover:text-black'
          }`}
        >
          Log in.
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  const [preset, setPreset] = useState<'PROFESSIONAL' | 'PERSONAL'>('PROFESSIONAL');

  return (
    <Suspense fallback={null}>
      <SignUpPageInner onPreset={setPreset} />
    </Suspense>
  );
}

function SignUpPageInner({ onPreset }: { onPreset: (p: 'PROFESSIONAL' | 'PERSONAL') => void }) {
  const searchParams = useSearchParams();
  const preset = (searchParams.get('preset')?.toUpperCase() as 'PROFESSIONAL' | 'PERSONAL') || 'PROFESSIONAL';
  const isPro = preset === 'PROFESSIONAL';

  useEffect(() => { onPreset(preset); }, [preset]);

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500 ${
      isPro ? 'bg-[#0a0a0a]' : 'bg-[#f2f0eb]'
    }`}>
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </main>
  );
}
