'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardResolutionPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleResolveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formattedEmail = email.trim().toLowerCase();

    // Uses the SECURITY DEFINER RPC function to bypass pre-login RLS
    const { data, error } = await supabase.rpc('get_or_create_account', {
      target_email: formattedEmail,
    });

    if (error) {
      console.error('Account Resolution Error:', error);
      setMessage(`Unable to resolve account: ${error.message}`);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setMessage('Account resolved successfully. Directing...');
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-left">
          <h1 className="text-2xl font-bold tracking-tight">PULSE Command</h1>
          <p className="text-xs text-amber-500 font-mono tracking-wider">
            Professional Unified Live Share Experience
          </p>
        </div>

        <div className="w-full bg-neutral-950 border border-neutral-800 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="space-y-2 text-left">
            <h2 className="text-xl font-bold tracking-tight">Access Account Dashboard</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Enter your registered email address to access your Work & Personal profiles.
            </p>
          </div>

          {message && (
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
              <p className="text-xs text-neutral-300 text-center font-medium leading-relaxed">{message}</p>
            </div>
          )}

          <form onSubmit={handleResolveAccount} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                ACCOUNT EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl py-3 hover:bg-neutral-200 transition-all disabled:opacity-50"
            >
              {loading ? 'Resolving Account...' : 'Open Multi-Identity Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
