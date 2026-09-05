// app/portal/professional/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProfessionalLoginPage() {
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
      .eq('profile_type', 'PROFESSIONAL')
      .maybeSingle();

    if (error || !profile) {
      setMessage('No professional profile found for this email.');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/portal/professional/dashboard`,
      },
    });

    if (authError) {
      setMessage(authError.message);
    } else {
      setMessage('Check your email for the secure magic link access.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 text-center">
          <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">PULSE ENTERPRISE</span>
          <h1 className="text-xl font-bold tracking-tight">Professional Portal</h1>
          <p className="text-xs text-neutral-400">Sign in to manage your corporate card and team links.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-neutral-600 text-white placeholder-neutral-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Access Professional Dashboard'}
          </button>
        </form>

        {message && (
          <p className="text-xs text-center font-medium text-neutral-300 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
            {message}
          </p>
        )}

        <div className="text-center pt-2">
          <p className="text-[11px] text-neutral-500">
            Looking for a personal card?{' '}
            <a href="/portal/personal/login" className="text-emerald-400 hover:underline">
              Switch to Personal Portal
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}