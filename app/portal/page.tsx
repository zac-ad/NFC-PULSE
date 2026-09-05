// app/portal/page.tsx
'use client';

import Link from 'next/link';

export default function PortalGatewayPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans selection:bg-neutral-800">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800/80 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 text-center">
          <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">PULSE ECOSYSTEM</span>
          <h1 className="text-xl font-bold tracking-tight">Select Your Portal</h1>
          <p className="text-xs text-neutral-400">Choose your account type to proceed to authentication.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/portal/professional/login"
            className="block w-full p-4 bg-neutral-900/60 border border-neutral-800 hover:border-sky-500/50 rounded-2xl transition-all group shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">Professional Portal</p>
                <p className="text-xs text-neutral-400 mt-0.5">For corporate teams and business badges</p>
              </div>
              <span className="text-neutral-500 group-hover:text-sky-400 transition-colors font-mono">→</span>
            </div>
          </Link>

          <Link
            href="/portal/personal/login"
            className="block w-full p-4 bg-neutral-900/60 border border-neutral-800 hover:border-emerald-500/50 rounded-2xl transition-all group shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Personal Portal</p>
                <p className="text-xs text-neutral-400 mt-0.5">For individual consumer card links</p>
              </div>
              <span className="text-neutral-500 group-hover:text-emerald-400 transition-colors font-mono">→</span>
            </div>
          </Link>
        </div>

        <div className="text-center pt-2">
          <a href="/" className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors">
            ← Return to main site
          </a>
        </div>
      </div>
    </main>
  );
}