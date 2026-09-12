'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ProfessionalLoginPage() {
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
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <Link href="/portal" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">
            ← Back
          </Link>
          <h1 className="font-serif text-3xl text-white mt-6">Professional portal.</h1>
          <p className="text-[14px] text-white/40 mt-2">We&rsquo;ll send a sign-in link to your email.</p>
        </div>

        {sent ? (
          <div className="p-5 rounded-2xl border border-white/10 bg-[#141414] space-y-2">
            <p className="font-serif text-base text-white">Link sent.</p>
            <p className="text-[13px] text-white/40 leading-relaxed">
              Check <span className="text-white/70">{email}</span> and click the link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="w-full bg-[#141414] border border-white/[0.08] text-white rounded-xl px-4 py-3.5 text-[14px] placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-[#f2f0eb] transition-colors disabled:opacity-40"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}

        <p className="text-[12px] text-white/20 text-center">
          New here?{' '}
          <Link href="/signup?preset=PROFESSIONAL" className="text-white/50 hover:text-white transition-colors border-b border-white/20 pb-px">
            Create a professional profile.
          </Link>
        </p>
      </div>
    </main>
  );
}
