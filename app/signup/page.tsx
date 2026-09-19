'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import Link from 'next/link';

function SignUpForm() {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const preset = (searchParams.get('preset')?.toUpperCase() as 'PROFESSIONAL' | 'PERSONAL') || 'PROFESSIONAL';
  const isPro = preset === 'PROFESSIONAL';

  const [email, setEmail]     = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { document.title = 'PULSE | Create Account'; }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError('Please agree to the Terms and Privacy Policy to continue.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard?preset=${preset}`
          : undefined,
      },
    });
    if (err) { setError('Something went wrong. Please try again.'); }
    else { setSent(true); }
    setLoading(false);
  };

  const bg       = isPro ? 'bg-[#0a0a0a]'           : 'bg-[#f2f0eb]';
  const textMain = isPro ? 'text-[#f2f0eb]'          : 'text-black';
  const textDim  = isPro ? 'text-[#f2f0eb]/40'       : 'text-black/40';
  const textLink = isPro ? 'text-[#f2f0eb]/60 hover:text-[#f2f0eb] border-white/20'  : 'text-black/60 hover:text-black border-black/20';
  const inputCls = isPro
    ? 'bg-[#141414] border border-white/[0.08] text-[#f2f0eb] placeholder:text-white/20 focus:border-white/20'
    : 'bg-white border border-black/[0.08] text-black placeholder:text-black/25 focus:border-black/20';
  const btnCls   = isPro ? 'bg-[#f2f0eb] text-black hover:bg-white' : 'bg-black text-white hover:bg-[#1a1a1a]';
  const sentBg   = isPro ? 'bg-[#141414] border-white/10' : 'bg-white border-black/10';

  return (
    <main className={`min-h-screen ${bg} flex flex-col items-center justify-center p-6 font-sans`}>
      <div className="w-full max-w-sm space-y-8">

        <div className="space-y-1">
          <Link href="/onboarding" className={`text-[12px] font-mono transition-colors ${isPro ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'}`}>
            ← Back
          </Link>
          <h1 className={`font-serif text-3xl mt-5 ${textMain}`}>
            {isPro ? 'Professional identity.' : 'Personal identity.'}
          </h1>
          <p className={`text-[14px] mt-2 ${textDim}`}>
            We&rsquo;ll send a sign-in link to your email.
          </p>
        </div>

        {sent ? (
          <div className={`p-5 rounded-2xl border space-y-2 ${sentBg}`}>
            <p className={`font-serif text-base ${textMain}`}>Check your email.</p>
            <p className={`text-[13px] leading-relaxed ${textDim}`}>
              We sent a link to <span className={isPro ? 'text-[#f2f0eb]/70' : 'text-black/70'}>{email}</span>.
              Click it to access your dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label htmlFor="signup-email" className={`block font-mono text-[10px] tracking-widest uppercase ${textDim}`}>
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                autoFocus
                className={`w-full rounded-xl px-4 py-3.5 text-[14px] focus:outline-none ${inputCls}`}
              />
            </div>

            <label htmlFor="signup-consent" className="flex items-start gap-3 cursor-pointer">
              <input
                id="signup-consent"
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                required
                className="mt-0.5 w-4 h-4 shrink-0 accent-white cursor-pointer"
              />
              <span className={`text-[12px] leading-relaxed ${textDim}`}>
                I agree to PULSE&rsquo;s{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className={`border-b pb-px transition-colors ${textLink}`}>Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={`border-b pb-px transition-colors ${textLink}`}>Privacy Policy</Link>.
                Tap activity and approximate location may be recorded to show you how your card is being used.
              </span>
            </label>

            {error && <p className="text-[12px] text-red-400" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={loading || !consent}
              className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${btnCls}`}
            >
              {loading ? 'Sending…' : 'Continue with email'}
            </button>
          </form>
        )}

        <p className={`text-[12px] text-center ${isPro ? 'text-white/20' : 'text-black/30'}`}>
          Already have a card?{' '}
          <Link href="/activate" className={`border-b pb-px transition-colors ${textLink}`}>
            Activate it here.
          </Link>
        </p>

      </div>
    </main>
  );
}

// Suspense wrapper — fallback shows a branded screen, not a blank page
export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-2 h-2 rounded-full bg-[#f2f0eb]/20 mx-auto" />
          <p className="font-mono text-[11px] text-[#f2f0eb]/20 tracking-widest">PULSE</p>
        </div>
      </main>
    }>
      <SignUpForm />
    </Suspense>
  );
}
