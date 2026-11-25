'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get('token') || '';

  const [loading, setLoading] = useState(Boolean(rawToken));
  const [error, setError] = useState<string | null>(
    rawToken ? null : 'No verification token provided. Please check your activation email.'
  );
  const [verifiedData, setVerifiedData] = useState<{
    requestId: string;
    email: string;
    slug: string;
    profileType: string;
  } | null>(null);

  const verificationAttempted = useRef(false);

  useEffect(() => {
    document.title = 'PULSE | Verify Activation';

    if (!rawToken) return;

    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    // Immediately remove token from visible URL to avoid saving sensitive bearer token in history/referrer
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }

    async function performVerification() {
      try {
        const res = await fetch('/api/activate/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rawToken }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Verification link is invalid or has expired.');
        } else {
          setVerifiedData({
            requestId: data.requestId,
            email: data.email,
            slug: data.slug,
            profileType: data.profileType,
          });
        }
      } catch {
        setError('Network error while verifying. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }

    void performVerification();
  }, [rawToken]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-7 text-center">
        <div className="w-10 h-10 rounded-full border border-white/10 bg-[#141414] flex items-center justify-center mx-auto">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-[#f2f0eb]/40 animate-pulse' : error ? 'bg-red-400' : 'bg-emerald-400'}`} />
        </div>

        {loading ? (
          <div className="space-y-3">
            <p className="font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">PULSE Activation</p>
            <h1 className="font-serif text-2xl">Verifying your email…</h1>
            <p className="text-[14px] text-[#f2f0eb]/40 leading-relaxed">
              Validating your secure activation token. Please hold on.
            </p>
          </div>
        ) : error ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-red-400/60 tracking-widest uppercase">Verification Failed</p>
              <h1 className="font-serif text-2xl">Link unavailable</h1>
              <p className="text-[14px] text-[#f2f0eb]/50 leading-relaxed">{error}</p>
            </div>
            <div className="pt-2">
              <Link
                href="/activate"
                className="inline-block w-full py-3.5 rounded-xl bg-white/10 text-white text-[13px] font-medium hover:bg-white/15 transition-colors"
              >
                Start activation again
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-emerald-400/80 tracking-widest uppercase">Email Verified</p>
              <h1 className="font-serif text-2xl">Your email is confirmed.</h1>
              <p className="text-[14px] text-[#f2f0eb]/50 leading-relaxed">
                We verified <span className="text-white font-medium">{verifiedData?.email}</span>. Now sign in to complete your card setup and claim your link.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href={`/login?email=${encodeURIComponent(verifiedData?.email || '')}&next=${encodeURIComponent(`/activate/retry?request_id=${verifiedData?.requestId || ''}`)}`}
                className="block w-full py-3.5 rounded-xl bg-[#f2f0eb] text-black text-[13px] font-semibold hover:bg-white transition-colors"
              >
                Sign in to finish activation
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ActivationVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <p className="text-[12px] font-mono text-white/25 tracking-widest">Loading verification…</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
