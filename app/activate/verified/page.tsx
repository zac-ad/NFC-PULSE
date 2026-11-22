'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';

export default function ActivationVerifiedPage() {
  const params = useSearchParams();
  const router = useRouter();
  const requestId = params.get('request') || '';
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('Your email has been verified. Sign in to finish activating your card.');

  useEffect(() => { document.title = 'PULSE | Email Verified'; }, []);

  const resume = async () => {
    if (!requestId || working) return;
    setWorking(true);
    setMessage('Checking your sign-in and completing activation…');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setMessage('Email verified. Sign in with the email you verified, then return here to finish activation.');
        setWorking(false);
        return;
      }
      const response = await fetch('/api/activate/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ requestId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setMessage(data.error || 'Activation could not be completed.');
        setWorking(false);
        return;
      }
      router.replace(data.redirect || '/dashboard?activated=1');
    } catch {
      setMessage('Something went wrong. Please retry.');
      setWorking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex items-center justify-center px-6">
      <section className="w-full max-w-md space-y-5">
        <p className="font-mono text-xs tracking-[0.2em] text-white/40">PULSE</p>
        <h1 className="text-3xl font-serif">Email verified</h1>
        <p className="text-sm leading-relaxed text-white/55">{message}</p>
        {requestId && (
          <button onClick={resume} disabled={working} className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm hover:bg-white/10 disabled:opacity-50 transition">
            {working ? 'Please wait…' : 'Continue activation'}
          </button>
        )}
        <Link href="/portal" className="inline-block text-sm text-white/60 underline">Sign in</Link>
      </section>
    </main>
  );
}
