'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const typeParam = searchParams.get('type')?.toUpperCase();
  const [profileType, setProfileType] = useState<'PROFESSIONAL' | 'PERSONAL' | null>(
    typeParam === 'PROFESSIONAL' || typeParam === 'PERSONAL' ? typeParam : null
  );

  const [cardCode, setCardCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [consent, setConsent] = useState(false);
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.title = 'PULSE | Activate Hardware Pass';
    const codeParam = searchParams.get('code');
    if (codeParam) {
      // Pre-existing pattern in this codebase (same as fetch-on-mount
      // elsewhere) — pre-filling a field from a URL param on load.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCardCode(codeParam.toUpperCase().trim());
    }
  }, [searchParams]);

  const handleSelectType = (type: 'PROFESSIONAL' | 'PERSONAL') => {
    setProfileType(type);
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    router.replace(`/activate?${params.toString()}`);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardCode || !email || !slug || !fullName || !profileType) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }
    if (!consent) {
      setMessage({ type: 'error', text: 'Please agree to the Terms and Privacy Policy to continue.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardCode: cardCode.trim().toUpperCase(),
          fullName,
          email: email.trim().toLowerCase(),
          slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
          profileType,
          consent,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to activate hardware pass.');
      }

      setMessage({
        type: 'success',
        text: `Hardware pass successfully activated and linked! Redirecting...`,
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate hardware pass.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: If no profileType is chosen yet, show the identity picker cards
  if (!profileType) {
    return (
      <main className="min-h-screen bg-black text-white font-sans flex flex-col justify-between p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neutral-900/40 rounded-full blur-[140px] pointer-events-none -z-10" />

        <header className="w-full max-w-xl mx-auto flex items-center justify-between pt-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white text-black rounded-lg flex items-center justify-center font-bold text-sm">
              ⚡
            </div>
            <span className="text-sm font-bold tracking-widest uppercase">PULSE</span>
          </Link>
          <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
            Activation Step 1 of 2
          </span>
        </header>

        <div className="w-full max-w-xl mx-auto my-auto py-10 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Choose Activation Identity
            </h1>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
              Select whether this physical card is being configured for professional work or personal sharing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleSelectType('PROFESSIONAL')}
              className="p-6 bg-neutral-950 border border-neutral-800/80 hover:border-white rounded-3xl text-left transition-all duration-200 group flex flex-col justify-between h-64 hover:bg-neutral-900/50"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                  💼
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Professional Pass</h2>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Configured for career portfolios, vCards, and client payment networks.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900 text-xs font-bold text-neutral-300 group-hover:text-white">
                <span>Select Professional</span>
                <span>➔</span>
              </div>
            </button>

            <button
              onClick={() => handleSelectType('PERSONAL')}
              className="p-6 bg-neutral-950 border border-neutral-800/80 hover:border-white rounded-3xl text-left transition-all duration-200 group flex flex-col justify-between h-64 hover:bg-neutral-900/50"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                  🌴
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Personal Pass</h2>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Built for social handles, TikTok/Instagram deep links, and casual networking.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-neutral-900 text-xs font-bold text-neutral-300 group-hover:text-white">
                <span>Select Personal</span>
                <span>➔</span>
              </div>
            </button>
          </div>
        </div>

        <footer className="w-full max-w-xl mx-auto text-center pb-4">
          <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
            PULSE ACTIVATION ENGINE
          </p>
        </footer>
      </main>
    );
  }

  // STEP 2: Render the Activation Form with the chosen profileType locked in
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans selection:bg-neutral-800">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <button
            onClick={() => setProfileType(null)}
            className="text-[11px] text-neutral-400 hover:text-white transition-colors mb-2 inline-block"
          >
            ← Change Identity Type ({profileType})
          </button>
          <div className="w-10 h-10 bg-amber-950/80 border border-amber-800/80 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-lg font-bold shadow-lg">
            ⚡
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Activate Hardware Pass</h1>
          <p className="text-xs font-semibold text-amber-400 tracking-wide uppercase">
            {profileType} PASS ACTIVATION
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
            <label htmlFor="activate-card-code" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Hardware Card Code
            </label>
            <input
              id="activate-card-code"
              type="text"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value.toUpperCase())}
              placeholder="E.G. CARD-9002"
              required
              aria-required="true"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label htmlFor="activate-full-name" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              id="activate-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Isaac Salasiban"
              required
              aria-required="true"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label htmlFor="activate-email" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              id="activate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              aria-required="true"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label htmlFor="activate-slug" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Desired Profile Slug
            </label>
            <input
              id="activate-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder={profileType === 'PROFESSIONAL' ? 'e.g. isaac' : 'e.g. isaac-personal'}
              required
              aria-required="true"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
            />
            <p className="text-[11px] text-neutral-500 mt-1">Your public URL will be: /p/{slug || 'your-slug'}</p>
          </div>

          <label htmlFor="activate-consent" className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              id="activate-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              aria-required="true"
              className="mt-0.5 w-4 h-4 shrink-0 accent-white cursor-pointer"
            />
            <span className="text-[11px] text-neutral-400 leading-relaxed">
              I agree to PULSE&rsquo;s{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white border-b border-neutral-600 pb-px">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white border-b border-neutral-600 pb-px">
                Privacy Policy
              </a>, including tap location logging for this card.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !consent}
            className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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