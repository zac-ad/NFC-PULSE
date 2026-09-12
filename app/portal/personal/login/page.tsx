'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PersonalLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (err) { setError(err.message); } else { setSent(true); }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#f2f0eb] text-[#0a0a0a] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <Link href="/portal" className="text-[12px] text-black/30 hover:text-black/60 transition-colors">
            ← Back
          </Link>
          <h1 className="font-serif text-3xl text-black mt-6">Personal portal.</h1>
          <p className="text-[14px] text-black/40 mt-2">We&rsquo;ll send a sign-in link to your email.</p>
        </div>

        {sent ? (
          <div className="p-5 rounded-2xl border border-black/10 bg-white space-y-2">
            <p className="font-serif text-base text-black">Link sent.</p>
            <p className="text-[13px] text-black/40 leading-relaxed">
              Check <span className="text-black/70">{email}</span> and click the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              className="w-full bg-white border border-black/[0.08] text-black rounded-xl px-4 py-3.5 text-[14px] placeholder:text-black/25 focus:outline-none focus:border-black/20"
            />
            {error && <p className="text-[12px] text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-black text-white text-[13px] font-semibold hover:bg-[#1a1a1a] transition-colors disabled:opacity-40"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        <p className="text-[12px] text-black/30 text-center">
          New here?{' '}
          <Link href="/signup?preset=PERSONAL" className="text-black/60 hover:text-black transition-colors border-b border-black/20 pb-px">
            Create a personal profile.
          </Link>
        </p>
      </div>
    </main>
  );
}
