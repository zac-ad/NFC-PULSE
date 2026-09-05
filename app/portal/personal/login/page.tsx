// app/portal/personal/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PersonalLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('profile_type', 'PERSONAL')
      .maybeSingle();

    if (error || !profile) {
      setMessage('No personal profile found for this email address.');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/portal/personal/dashboard`,
      },
    });

    if (authError) {
      setMessage(authError.message);
    } else {
      setMessage('Magic link sent! Check your inbox to sign in.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 text-center">
          <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">PULSE CONSUMER</span>
          <h1 className="text-xl font-bold tracking-tight">Personal Portal</h1>
          <p className="text-xs text-neutral-400">Sign in to update your personal networking card links.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-neutral-600 text-white placeholder-neutral-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-neutral-800 border border-neutral-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-700 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Access Personal Dashboard'}
          </button>
        </form>

        {message && (
          <p className="text-xs text-center font-medium text-neutral-300 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
            {message}
          </p>
        )}

        <div className="text-center pt-2">
          <p className="text-[11px] text-neutral-500">
            Looking for a professional badge?{' '}
            <a href="/portal/professional/login" className="text-sky-400 hover:underline">
              Switch to Professional Portal
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}