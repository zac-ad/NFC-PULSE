'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfessionalLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formattedEmail = email.trim().toLowerCase();
    const origin = window.location.origin;

    // 1. Resolve or create account row in Supabase 'accounts' table via RPC
    const { error: rpcError } = await supabase.rpc('get_or_create_account', {
      target_email: formattedEmail,
    });

    if (rpcError) {
      console.error('Account Resolution Error:', rpcError);
      setMessage(`Error resolving account: ${rpcError.message}`);
      setLoading(false);
      return;
    }

    // 2. Trigger Magic Link via Supabase Auth
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: formattedEmail,
      options: {
        emailRedirectTo: `${origin}/dashboard`,
      },
    });

    if (authError) {
      console.error('Supabase OTP Error:', authError);
      setMessage(`Error: ${authError.message}`);
    } else {
      setMessage('Magic link sent! Check your email to sign in.');
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-6 bg-neutral-950 border border-neutral-800 p-8 rounded-3xl shadow-2xl">
        <div className="space-y-2 text-center">
          <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase">Enterprise Access</span>
          <h1 className="text-2xl font-bold tracking-tight">Professional Portal</h1>
          <p className="text-xs text-neutral-400">Enter your email to receive a magic sign-in link.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-600"
          />

          {message && <p className="text-xs text-neutral-300 text-center font-medium leading-relaxed">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl py-3 hover:bg-neutral-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Sending Link...' : 'Send Magic Link'}
          </button>
        </form>
      </div>
    </main>
  );
}