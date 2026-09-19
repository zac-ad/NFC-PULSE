'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import Link from 'next/link';

// Slug rules: lowercase letters, numbers, hyphens only. No leading/trailing hyphens.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')   // replace invalid chars with hyphen
    .replace(/-{2,}/g, '-')         // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '');       // strip leading/trailing hyphens
}

function ActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const codeFromUrl = searchParams.get('code')?.toUpperCase().trim() || '';
  const typeParam = searchParams.get('type')?.toUpperCase();

  const [step, setStep] = useState<1 | 2>(
    typeParam === 'PROFESSIONAL' || typeParam === 'PERSONAL' ? 2 : 1
  );
  const [profileType, setProfileType] = useState<'PROFESSIONAL' | 'PERSONAL' | null>(
    typeParam === 'PROFESSIONAL' || typeParam === 'PERSONAL' ? typeParam : null
  );

  const [cardCode, setCardCode] = useState(codeFromUrl);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync cardCode if URL param arrives late (Suspense boundary)
  useEffect(() => {
    if (codeFromUrl && !cardCode) setCardCode(codeFromUrl);
  }, [codeFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = 'PULSE | Activate Card';
  }, []);

  const handleSelectType = (type: 'PROFESSIONAL' | 'PERSONAL') => {
    setProfileType(type);
    setStep(2);
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    router.replace(`/activate?${params.toString()}`);
  };

  const handleSlugChange = (raw: string) => {
    const cleaned = sanitizeSlug(raw);
    setSlug(cleaned);
    if (!cleaned) {
      setSlugError('');
      return;
    }
    if (cleaned.length < 2) {
      setSlugError('Slug must be at least 2 characters.');
      return;
    }
    if (!SLUG_RE.test(cleaned)) {
      setSlugError('Letters, numbers, and hyphens only.');
      return;
    }
    setSlugError('');
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardCode || !email || !slug || !fullName || !profileType) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }
    if (slugError) {
      setMessage({ type: 'error', text: 'Fix the slug before continuing.' });
      return;
    }
    if (!SLUG_RE.test(slug)) {
      setMessage({ type: 'error', text: 'Slug can only contain lowercase letters, numbers, and hyphens.' });
      return;
    }
    if (!consent) {
      setMessage({ type: 'error', text: 'Please agree to the Terms and Privacy Policy to continue.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Activate the card and create the profile
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardCode: cardCode.trim().toUpperCase(),
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          slug: slug.trim(),
          profileType,
          consent,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Activation failed. Please try again.' });
        setLoading(false);
        return;
      }

      // 2. Card is now active. Send a magic link so the user can log in.
      //    This is the correct post-activation flow — activation creates the
      //    account/profile/card binding but does NOT create a Supabase Auth
      //    session. The magic link does.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/dashboard`
            : undefined,
        },
      });

      if (otpError) {
        // Card is already activated at this point — just tell them to log in manually
        setMessage({
          type: 'success',
          text: 'Your card is active. We could not send the login email — go to the portal to sign in.',
        });
        setLoading(false);
        return;
      }

      // 3. Success state — show the check-your-email screen
      setMessage({
        type: 'success',
        text: `Your card is active. We sent a sign-in link to ${email.trim().toLowerCase()} — click it to reach your dashboard.`,
      });

    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    }

    setLoading(false);
  };

  // ── Step 1: Choose identity type ────────────────────────────────────────────
  if (step === 1) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans flex flex-col">

        <header className="px-6 pt-8 pb-0">
          <Link href="/" className="inline-flex items-center gap-2 text-[#f2f0eb]/30 hover:text-[#f2f0eb]/70 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
            </svg>
            <span className="text-[12px] font-mono tracking-wider">PULSE</span>
          </Link>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md space-y-10">

            {/* Context — explain why they're here */}
            <div className="space-y-3">
              {codeFromUrl && (
                <p className="font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">
                  {codeFromUrl}
                </p>
              )}
              <h1 className="font-serif text-3xl text-[#f2f0eb]">
                {codeFromUrl
                  ? 'This card is ready to activate.'
                  : 'Activate your card.'}
              </h1>
              <p className="text-[14px] text-[#f2f0eb]/40 leading-relaxed">
                Choose which identity this card will carry. You can only pick one per card.
              </p>
            </div>

            {/* Identity picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleSelectType('PROFESSIONAL')}
                className="group p-6 bg-[#141414] border border-white/[0.06] hover:border-white/20 rounded-2xl text-left transition-all duration-200 space-y-6"
              >
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">Professional</p>
                  <p className="text-[14px] text-[#f2f0eb]/70 leading-relaxed">
                    Work identity — LinkedIn, vCard, calendar, portfolio.
                  </p>
                </div>
                <p className="font-mono text-[11px] text-[#f2f0eb]/30 group-hover:text-[#f2f0eb]/60 transition-colors">
                  Select →
                </p>
              </button>

              <button
                onClick={() => handleSelectType('PERSONAL')}
                className="group p-6 bg-[#141414] border border-white/[0.06] hover:border-white/20 rounded-2xl text-left transition-all duration-200 space-y-6"
              >
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">Personal</p>
                  <p className="text-[14px] text-[#f2f0eb]/70 leading-relaxed">
                    Personal identity — socials, messaging, payment handles.
                  </p>
                </div>
                <p className="font-mono text-[11px] text-[#f2f0eb]/30 group-hover:text-[#f2f0eb]/60 transition-colors">
                  Select →
                </p>
              </button>
            </div>

            <p className="text-[12px] text-[#f2f0eb]/20 text-center">
              Already activated?{' '}
              <Link href="/portal" className="text-[#f2f0eb]/40 hover:text-[#f2f0eb]/70 border-b border-white/10 pb-px transition-colors">
                Log in to your portal.
              </Link>
            </p>

          </div>
        </div>
      </main>
    );
  }

  // ── Step 2: Activation form ──────────────────────────────────────────────────

  // Success screen — shown after activation + magic link sent
  if (message?.type === 'success') {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="w-10 h-10 rounded-full border border-white/10 bg-[#141414] flex items-center justify-center mx-auto">
            <div className="w-2 h-2 rounded-full bg-[#f2f0eb]/60" />
          </div>
          <div className="space-y-3">
            <p className="font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">Card active</p>
            <h1 className="font-serif text-2xl text-[#f2f0eb]">Check your email.</h1>
            <p className="text-[14px] text-[#f2f0eb]/40 leading-relaxed max-w-xs mx-auto">
              {message.text}
            </p>
          </div>
          <Link
            href="/portal"
            className="inline-block text-[13px] px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-[#f2f0eb] transition-colors"
          >
            Go to portal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans flex flex-col">

      <header className="px-6 pt-8">
        <button
          onClick={() => { setStep(1); setProfileType(null); }}
          className="inline-flex items-center gap-1.5 text-[#f2f0eb]/30 hover:text-[#f2f0eb]/70 transition-colors"
        >
          <span className="text-[12px] font-mono tracking-wider">← Back</span>
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">

          {/* Header */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">
              {profileType} · Step 2 of 2
            </p>
            <h1 className="font-serif text-3xl text-[#f2f0eb]">Set up your profile.</h1>
            <p className="text-[14px] text-[#f2f0eb]/40 leading-relaxed">
              This becomes your live profile when someone taps your card.
            </p>
          </div>

          {/* Error message */}
          {message?.type === 'error' && (
            <div className="px-4 py-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-[13px]" role="alert">
              {message.text}
            </div>
          )}

          <form onSubmit={handleActivate} autoComplete="off" className="space-y-5">

            {/* Card code — locked if from URL, editable if typed manually */}
            <div className="space-y-1.5">
              <label htmlFor="card-code" className="block font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">
                Card code
              </label>
              {codeFromUrl ? (
                // Pre-filled from URL: show as read-only so user can't accidentally change it
                <div className="w-full bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-3 text-[14px] text-[#f2f0eb]/50 font-mono flex items-center justify-between">
                  <span>{cardCode}</span>
                  <span className="font-mono text-[10px] text-[#f2f0eb]/20 tracking-widest">LOCKED</span>
                </div>
              ) : (
                <input
                  id="card-code"
                  type="text"
                  value={cardCode}
                  onChange={e => setCardCode(e.target.value.toUpperCase().trim())}
                  placeholder="CARD-00"
                  required
                  className="w-full bg-[#141414] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-[#f2f0eb] font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              )}
            </div>

            {/* Full name */}
            <div className="space-y-1.5">
              <label htmlFor="full-name" className="block font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Isaac Salasiban"
                required
                autoFocus
                className="w-full bg-[#141414] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-[#f2f0eb] placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                className="w-full bg-[#141414] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-[#f2f0eb] placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
              <p className="text-[11px] text-[#f2f0eb]/25">
                We'll send your sign-in link here after activation.
              </p>
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label htmlFor="slug" className="block font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">
                Profile URL
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-[#f2f0eb]/25 pointer-events-none select-none">
                  /p/
                </span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder={profileType === 'PROFESSIONAL' ? 'isaac' : 'isaac-personal'}
                  required
                  className="w-full bg-[#141414] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#f2f0eb] placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
              {slugError ? (
                <p className="text-[11px] text-red-400">{slugError}</p>
              ) : (
                <p className="text-[11px] text-[#f2f0eb]/25">
                  Lowercase letters, numbers, and hyphens only. This is permanent.
                </p>
              )}
            </div>

            {/* Consent */}
            <label htmlFor="consent" className="flex items-start gap-3 cursor-pointer">
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                required
                className="mt-0.5 w-4 h-4 shrink-0 accent-white cursor-pointer"
              />
              <span className="text-[12px] text-[#f2f0eb]/35 leading-relaxed">
                I agree to PULSE&rsquo;s{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#f2f0eb]/55 hover:text-[#f2f0eb] border-b border-white/15 pb-px transition-colors">
                  Terms
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#f2f0eb]/55 hover:text-[#f2f0eb] border-b border-white/15 pb-px transition-colors">
                  Privacy Policy
                </a>
                , including tap location logging.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !consent || !!slugError}
              className="w-full py-3.5 rounded-xl bg-[#f2f0eb] text-black text-[13px] font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Activating…' : 'Activate card'}
            </button>

          </form>
        </div>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="font-mono text-[11px] text-[#f2f0eb]/20 tracking-widest">Loading…</p>
      </div>
    }>
      <ActivateContent />
    </Suspense>
  );
}
