'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EnterpriseLoginPage() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/enterprise/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode }),
    });
    if (res.ok) {
      router.push('/enterprise/dashboard');
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Invalid access code.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <Link href="/" className="text-[12px] text-white/25 hover:text-white/50 transition-colors">
            ← Home
          </Link>
          <p className="font-mono text-[10px] text-white/25 tracking-widest mt-6 mb-4">ENTERPRISE</p>
          <h1 className="font-serif text-3xl text-white">Organization access.</h1>
          <p className="text-[14px] text-white/35 mt-2">Enter your organization&rsquo;s access code to manage your fleet.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={accessCode}
            onChange={e => setAccessCode(e.target.value)}
            placeholder="Access code"
            required
            className="w-full bg-[#141414] border border-white/[0.08] text-white rounded-xl px-4 py-3.5 text-[14px] placeholder:text-white/20 focus:outline-none focus:border-white/20 tracking-widest text-center"
          />
          {error && <p className="text-[12px] text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-[#f2f0eb] transition-colors disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Access fleet command'}
          </button>
        </form>
      </div>
    </main>
  );
}
