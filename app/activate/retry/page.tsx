'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ActivationRetryContent() {
  const params = useSearchParams();
  const router = useRouter();
  const requestId = params.get('request_id') || '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const retry = async () => {
    if (!requestId) {
      setError('This activation link is missing its request details. Please start activation again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/activate/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || 'We could not finish activation. Please try again.');
        return;
      }
      router.replace('/dashboard?activated=1');
    } catch {
      setError('Connection problem. Check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-7 text-center">
        <div className="w-10 h-10 rounded-full border border-white/10 bg-[#141414] flex items-center justify-center mx-auto">
          <div className="w-2 h-2 rounded-full bg-[#f2f0eb]/60" />
        </div>
        <div className="space-y-3">
          <p className="font-mono text-[10px] text-[#f2f0eb]/25 tracking-widest uppercase">Activation recovery</p>
          <h1 className="font-serif text-2xl">You're almost there.</h1>
          <p className="text-[14px] text-[#f2f0eb]/40 leading-relaxed">
            Your email verification may be complete, but we couldn't finish activating your card. If you're signed in, you can safely retry.
          </p>
        </div>
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-[13px]" role="alert">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={retry}
          disabled={loading || !requestId}
          aria-busy={loading}
          className="w-full py-3.5 rounded-xl bg-[#f2f0eb] text-black text-[13px] font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Retrying activation…' : 'Retry activation'}
        </button>
        <p className="text-[12px] text-[#f2f0eb]/25">
          If you are not signed in, <Link href="/portal" className="text-[#f2f0eb]/50 underline underline-offset-4">sign in to your account</Link>, then return to this page.
        </p>
        <Link href="/activate" className="inline-block text-[12px] text-[#f2f0eb]/35 hover:text-[#f2f0eb]/70">
          Start a new activation
        </Link>
      </div>
    </main>
  );
}


export default function ActivationRetryPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex items-center justify-center px-6"><p className="text-sm text-[#f2f0eb]/40">Loading activation recovery…</p></main>}>
      <ActivationRetryContent />
    </Suspense>
  );
}
