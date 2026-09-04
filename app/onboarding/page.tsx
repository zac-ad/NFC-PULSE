'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingIdentityPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<'PROFESSIONAL' | 'PERSONAL' | null>(null);

  const handleSelect = (type: 'PROFESSIONAL' | 'PERSONAL') => {
    setSelectedType(type);
    setTimeout(() => {
      router.push(`/signup?preset=${type}`);
    }, 250);
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800 flex flex-col justify-between p-6 relative overflow-hidden">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neutral-900/40 rounded-full blur-[140px] pointer-events-none -z-10" />

      <header className="w-full max-w-xl mx-auto flex items-center justify-between pt-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white text-black rounded-lg flex items-center justify-center font-bold text-sm">
            ⚡
          </div>
          <span className="text-sm font-bold tracking-widest uppercase">PULSE</span>
        </Link>
        <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
          Step 1 of 2
        </span>
      </header>

      <div className="w-full max-w-xl mx-auto my-auto py-10 space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Choose Your Identity
          </h1>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
            Select how you want to present yourself. You can toggle or add profiles anytime inside your command dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <button
            onClick={() => handleSelect('PROFESSIONAL')}
            className={`p-6 bg-neutral-950 border rounded-3xl text-left transition-all duration-200 relative group flex flex-col justify-between h-64 ${
              selectedType === 'PROFESSIONAL'
                ? 'border-white bg-neutral-900 scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                : 'border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/50'
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                💼
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Professional</h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Engineered for career portfolios, downloadable vCards, and client payment QRs.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-neutral-900 text-xs font-bold text-neutral-300 group-hover:text-white">
              <span>Select Work Card</span>
              <span>➔</span>
            </div>
          </button>

          <button
            onClick={() => handleSelect('PERSONAL')}
            className={`p-6 bg-neutral-950 border rounded-3xl text-left transition-all duration-200 relative group flex flex-col justify-between h-64 ${
              selectedType === 'PERSONAL'
                ? 'border-white bg-neutral-900 scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                : 'border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/50'
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                🌴
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Personal</h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Built for social handles, Instagram/TikTok deep links, personal GCash, and casual sharing.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-900 text-xs font-bold text-neutral-300 group-hover:text-white">
              <span>Select Life Card</span>
              <span>➔</span>
            </div>
          </button>

        </div>

      </div>

      <footer className="w-full max-w-xl mx-auto text-center pb-4">
        <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
          PULSE IDENTITY ENGINE
        </p>
      </footer>

    </main>
  );
}