'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function AuthForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preset = searchParams.get('preset') || 'PROFESSIONAL';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.title = 'PULSE | Authentication';
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard?preset=${preset}` : undefined,
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({
        type: 'success',
        text: `Magic link dispatched to ${email}! Check your inbox to complete setup for your ${preset.toLowerCase()} identity.`,
      });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md w-full bg-neutral-950 border border-neutral-800/80 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 text-white rounded-2xl flex items-center justify-center mx-auto font-bold shadow-inner">
          ⚡
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Create Account or Log In</h1>
        <p className="text-xs text-neutral-400">
          Setting up your <span className="text-white font-semibold">{preset === 'PROFESSIONAL' ? '💼 Professional' : '🌴 Personal'}</span> PULSE identity.
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

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            required
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-lg disabled:opacity-50"
        >
          {loading ? 'Sending Magic Link...' : 'Continue with Email ➔'}
        </button>
      </form>

      <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
        We will email you a secure passwordless login link. No passwords required.
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800 flex flex-col justify-between p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neutral-900/40 rounded-full blur-[140px] pointer-events-none -z-10" />

      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-4">
        <Link href="/onboarding" className="text-xs text-neutral-400 hover:text-white transition-colors">
          ← Back to Identity
        </Link>
        <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
          Step 2 of 2
        </span>
      </header>

      <div className="my-auto flex justify-center py-6">
        <Suspense fallback={<div className="text-xs text-neutral-500 font-mono">Loading gate...</div>}>
          <AuthForm />
        </Suspense>
      </div>

      <footer className="w-full max-w-md mx-auto text-center pb-4">
        <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
          POWERED BY PULSE
        </p>
      </footer>
    </main>
  );
}