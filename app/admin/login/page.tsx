// app/admin/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });

    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      setError('Invalid master passphrase.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">System Override</span>
          <h1 className="text-2xl font-bold tracking-tight">Master Admin</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Enter Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-500 transition-colors"
              required
            />
          </div>
          
          {error && <p className="text-xs text-red-400 font-medium text-center">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl py-3 hover:bg-neutral-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Unlock Systems'}
          </button>
        </form>
      </div>
    </main>
  );
}