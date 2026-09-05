// app/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MarketingLandingPage() {
  const [activePreview, setActivePreview] = useState<'pro' | 'personal'>('pro');

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800 flex flex-col relative overflow-hidden">
      
      {/* Background Lighting Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/30 via-neutral-950/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center font-black text-base shadow-lg group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <span className="text-lg font-black tracking-widest uppercase text-white">PULSE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-neutral-400">
          <a href="#vision" className="hover:text-white transition-colors">Vision</a>
          <a href="#portals" className="hover:text-white transition-colors">Portals</a>
          <a href="#hardware" className="hover:text-white transition-colors">Hardware</a>
          <a href="#features" className="hover:text-white transition-colors">Architecture</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/portal/professional/login" 
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Pro Portal
          </Link>
          <Link 
            href="/portal/personal/login" 
            className="px-4 py-2 text-xs font-bold bg-white text-black rounded-full hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            Personal Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-20 z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-md shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest text-neutral-300 uppercase">
            PULSE HARDWARE PLATFORM v2.0
          </span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.05] bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-200 to-neutral-600">
          One Pass. Dual Identities.
        </h1>
        
        <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed font-normal">
          PULSE pairs precision-crafted physical NFC hardware with isolated profile engines. Deploy dedicated Professional and Personal gateways with zero cross-contamination.
        </p>

        {/* Interactive Hero Card Preview */}
        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative mb-12 text-left space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-500" />
              <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Interactive Hardware Preview</span>
            </div>
            
            {/* Mode Switcher Buttons */}
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setActivePreview('pro')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  activePreview === 'pro' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                PRO MODE
              </button>
              <button
                onClick={() => setActivePreview('personal')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  activePreview === 'personal' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                PERSONAL MODE
              </button>
            </div>
          </div>

          {/* Dynamic Card Graphic */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 space-y-4 shadow-inner relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono tracking-widest uppercase text-neutral-500">BOUND IDENTITY</span>
                <p className="text-base font-bold text-white tracking-wide">
                  {activePreview === 'pro' ? 'Isaac Salasiban' : 'Isaac S.'}
                </p>
                <p className="text-xs text-neutral-400">
                  {activePreview === 'pro' ? 'Systems Engineer & Architect' : 'Creator & Digital Strategist'}
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {activePreview === 'pro' ? 'PRO-PASS' : 'PERS-PASS'}
              </span>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono text-neutral-400">
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                {activePreview === 'pro' ? '💼 LinkedIn Direct' : '📸 Instagram Deep-Link'}
              </span>
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                {activePreview === 'pro' ? '📇 vCard Telemetry' : '💬 WhatsApp Direct'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono px-1">
            <span>TAP STATUS: READY</span>
            <span>NFC HIGH-FREQ 13.56MHz</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div id="portals" className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          <Link 
            href="/portal/professional/login" 
            className="p-6 bg-white text-black rounded-2xl hover:bg-neutral-200 transition-all text-left shadow-2xl group active:scale-[0.98] border border-white"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-600">Enterprise</span>
              <span className="text-sm group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <h3 className="text-base font-bold">Professional Portal</h3>
            <p className="text-xs text-neutral-600 mt-1">Access executive vCard, corporate links, and meeting telemetry.</p>
          </Link>

          <Link 
            href="/portal/personal/login" 
            className="p-6 bg-neutral-950 border border-neutral-800 text-white rounded-2xl hover:border-neutral-700 transition-all text-left shadow-2xl group active:scale-[0.98]"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-500">Consumer</span>
              <span className="text-sm group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <h3 className="text-base font-bold">Personal Portal</h3>
            <p className="text-xs text-neutral-400 mt-1">Manage personal social channels, payment QR handles, and media.</p>
          </Link>
        </div>
      </section>

      {/* Meaning & Vision Section */}
      <section id="vision" className="w-full max-w-5xl mx-auto px-6 py-16 border-t border-neutral-900 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">Core Philosophy</span>
            <h2 className="text-3xl font-bold tracking-tight">Purpose-Built Identity Segregation</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Traditional business cards combine work emails with casual phone numbers, creating digital noise. PULSE strictly enforces a one-card-to-one-identity protocol.
            </p>
            <p className="text-sm text-neutral-400 leading-relaxed">
              When you hand over your Professional Pass, recipients see only corporate contact paths. When sharing your Personal Pass, your social identity takes center stage.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">🔒</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Leakage</h4>
              <p className="text-[11px] text-neutral-500">Complete architectural isolation between portals.</p>
            </div>
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">⚡</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Native Deep-Link</h4>
              <p className="text-[11px] text-neutral-500">Opens native iOS & Android apps automatically on tap.</p>
            </div>
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">📇</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instant vCard</h4>
              <p className="text-[11px] text-neutral-500">One-tap contact saving direct to phone contacts.</p>
            </div>
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">🛡️</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hardware Lock</h4>
              <p className="text-[11px] text-neutral-500">Instantly kill pass visibility if lost or misplaced.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Section */}
      <section id="hardware" className="w-full max-w-5xl mx-auto px-6 py-16 z-10">
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-md">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Precision Architecture</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Matte Black NFC Hardware</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Industrial durability meets stealth aesthetics. High-frequency embedded NFC antennas wrapped in water-resistant matte finish with laser-engraved QR fallback for universal compatibility.
            </p>
            <div className="pt-2 flex items-center gap-6 text-xs text-neutral-300 font-mono">
              <span>✓ BATTERYLESS</span>
              <span>✓ UNIVERSAL TAP</span>
            </div>
          </div>

          <div className="w-full max-w-xs aspect-[1.586/1] bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between relative group hover:border-neutral-700 transition-all">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-400">PULSE PASS</span>
              </div>
              <span className="text-xs">⚡</span>
            </div>
            <div>
              <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">HARDWARE ID</p>
              <p className="text-sm font-mono font-bold text-neutral-200 tracking-widest mt-0.5">CARD-9002</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-8 z-10 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 font-mono gap-4">
          <p>© {new Date().getFullYear()} PULSE SMART PLATFORM. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <Link href="/portal/professional/login" className="hover:text-neutral-300 transition-colors">Pro Portal</Link>
            <Link href="/portal/personal/login" className="hover:text-neutral-300 transition-colors">Personal Portal</Link>
            <Link href="/activate" className="hover:text-neutral-300 transition-colors">Activate Pass</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}