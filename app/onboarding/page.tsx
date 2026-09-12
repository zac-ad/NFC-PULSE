'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<'PROFESSIONAL' | 'PERSONAL' | null>(null);

  const handleSelect = (type: 'PROFESSIONAL' | 'PERSONAL') => {
    setSelected(type);
    setTimeout(() => router.push(`/signup?preset=${type}`), 200);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] flex flex-col p-6 font-sans">
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pt-2 pb-12">
        <Link href="/" className="flex items-center gap-2 font-serif text-base text-white/50 hover:text-white transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
          </svg>
          PULSE
        </Link>
        <span className="text-[11px] font-mono text-white/20 tracking-widest">1 of 2</span>
      </header>

      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center space-y-10">
        <div className="space-y-3">
          <h1 className="font-serif text-[clamp(28px,5vw,44px)] leading-tight text-white">
            Which version of you<br />are you sharing?
          </h1>
          <p className="text-[14px] text-white/35 leading-relaxed max-w-sm">
            Each card carries one identity. Choose the one this card is for.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleSelect('PROFESSIONAL')}
            className={`p-6 rounded-2xl border text-left transition-all duration-200 ${
              selected === 'PROFESSIONAL'
                ? 'bg-white border-white'
                : 'bg-[#141414] border-white/[0.08] hover:border-white/20'
            }`}
          >
            <p className={`font-serif text-xl mb-2 ${selected === 'PROFESSIONAL' ? 'text-black' : 'text-white'}`}>
              Professional
            </p>
            <p className={`text-[13px] leading-relaxed ${selected === 'PROFESSIONAL' ? 'text-black/50' : 'text-white/35'}`}>
              Work identity. Corporate vCard, LinkedIn, tap telemetry.
            </p>
            <p className={`text-[12px] mt-4 font-medium ${selected === 'PROFESSIONAL' ? 'text-black/60' : 'text-white/25'}`}>
              Select →
            </p>
          </button>

          <button
            onClick={() => handleSelect('PERSONAL')}
            className={`p-6 rounded-2xl border text-left transition-all duration-200 ${
              selected === 'PERSONAL'
                ? 'bg-[#f2f0eb] border-[#f2f0eb]'
                : 'bg-[#f2f0eb]/[0.03] border-white/[0.08] hover:border-white/20'
            }`}
          >
            <p className={`font-serif text-xl mb-2 ${selected === 'PERSONAL' ? 'text-black' : 'text-white'}`}>
              Personal
            </p>
            <p className={`text-[13px] leading-relaxed ${selected === 'PERSONAL' ? 'text-black/50' : 'text-white/35'}`}>
              Personal identity. Socials, messaging, payment handles.
            </p>
            <p className={`text-[12px] mt-4 font-medium ${selected === 'PERSONAL' ? 'text-black/60' : 'text-white/25'}`}>
              Select →
            </p>
          </button>
        </div>
      </div>

      <footer className="max-w-xl mx-auto w-full pt-8 pb-2 text-center">
        <p className="text-[11px] font-mono text-white/15 tracking-widest">PULSE</p>
      </footer>
    </main>
  );
}
