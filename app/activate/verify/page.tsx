'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyActivationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'ready' | 'working' | 'success' | 'error'>('ready');
  const [message, setMessage] = useState('');
  const token = params.get('token') || '';

  useEffect(() => {
    document.title = 'PULSE | Verify Email';
  }, []);

  const verify = async () => {
    if (!token || status === 'working') return;
    setStatus('working');
    setMessage('Verifying your email…');
    // Remove the bearer token from the visible URL before sending it to the server.
    router.replace('/activate/verify');
    try {
      const response = await fetch('/api/activate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setStatus('error');
        setMessage(data.error || 'This verification link is invalid or expired.');
        return;
      }
      setStatus('success');
      setMessage('Email verified. Continue by signing in or creating your PULSE account.');
      if (data.request_id) {
        router.replace('/activate/verified?request=' + encodeURIComponent(data.request_id));
      }
    } catch {
      setStatus('error');
      setMessage('Unable to verify right now. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex items-center justify-center px-6">
      <section className="w-full max-w-md space-y-5">
        <p className="font-mono text-xs tracking-[0.2em] text-white/40">PULSE</p>
        <h1 className="text-3xl font-serif">Verify your email</h1>
        <p className="text-sm leading-relaxed text-white/55">
          Confirm that you own this email address to continue activating your card.
          This does not sign you in or change your account.
        </p>
        {!token && status === 'ready' && <p className="text-sm text-white/50">The verification token is missing. Please open the link from your email.</p>}
        {message && <p role="status" className="text-sm leading-relaxed text-white/70">{message}</p>}
        {status === 'ready' && token && (
          <button onClick={verify} className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 transition">
            Verify email
          </button>
        )}
        {status === 'working' && <p className="text-sm text-white/40">Please wait…</p>}
        {status === 'error' && <button onClick={() => { setStatus('ready'); setMessage(''); }} className="text-sm underline text-white/70">Try again</button>}
      </section>
    </main>
  );
}

export default function VerifyActivationPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#0a0a0a]" />}><VerifyActivationContent /></Suspense>;
}
