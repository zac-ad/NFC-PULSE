'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnterpriseLoginPage() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
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
    <main className="min-h-screen bg-black text-white p-4 flex items-center justify-center font-sans">
      <form onSubmit={handleSubmit} className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 space-y-4 shadow-2xl text-center">
        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-wider">
          Enterprise Workspace
        </span>
        <h1 className="text-xl font-bold text-white">Organization Access</h1>
        <p className="text-xs text-neutral-400">Enter your organization&rsquo;s access code to manage your fleet.</p>
        <input
          type="password"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Access code"
          required
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-center text-white tracking-widest focus:outline-none focus:border-neutral-600"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-bold text-xs rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Access Fleet Command'}
        </button>
      </form>
    </main>
  );
}
