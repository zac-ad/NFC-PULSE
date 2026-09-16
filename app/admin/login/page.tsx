'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else if (res.status === 429) {
      setError('Too many attempts. Try again in 15 minutes.');
    } else {
      setError('Invalid passphrase.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <p className="font-mono text-[10px] text-white/25 tracking-widest mb-4">ADMIN ACCESS</p>
          <h1 className="font-serif text-3xl text-white">Fleet Command.</h1>
          <p className="text-[14px] text-white/35 mt-2">Enter your admin passphrase to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            placeholder="Passphrase"
            required
            className="w-full bg-[#141414] border border-white/[0.08] text-white rounded-xl px-4 py-3.5 text-[14px] placeholder:text-white/20 focus:outline-none focus:border-white/20 tracking-widest text-center"
          />
          {error && <p className="text-[12px] text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-[#f2f0eb] transition-colors disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  );
}
