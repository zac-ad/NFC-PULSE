// app/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MarketingLandingPage() {
  const [selectedCard, setSelectedCard] = useState<'pro' | 'personal'>('pro');

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-neutral-800 flex flex-col relative overflow-hidden">
      
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/30 via-neutral-950/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-widest uppercase text-white">PULSE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-neutral-400">
          <a href="#architecture" className="hover:text-white transition-colors">1:1 Architecture</a>
          <a href="#portals" className="hover:text-white transition-colors">Portals</a>
          <a href="#hardware" className="hover:text-white transition-colors">Hardware</a>
        </nav>

        {/* Explicit Log In & Sign Up Header Actions */}
        <div className="flex items-center gap-3">
          <Link 
            href="/portal/professional/login" 
            className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link 
            href="/portal/professional/login" 
            className="px-4 py-2 text-xs font-bold bg-white text-black rounded-full hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-20 z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-md shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest text-neutral-300 uppercase">
            STRICT 1:1 HARDWARE-TO-IDENTITY PROTOCOL
          </span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.05] bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-200 to-neutral-600">
          Dedicated Cards. Pure Identity.
        </h1>
        
        <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed font-normal">
          PULSE pairs precision physical NFC cards with isolated digital profiles. One physical card strictly binds to one identity profile—no overlap, no data cross-contamination.
        </p>

        {/* Card Hardware Preview Switcher */}
        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative mb-12 text-left space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-500" />
              <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Interactive Preview</span>
            </div>
            
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setSelectedCard('pro')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  selectedCard === 'pro' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                PRO CARD
              </button>
              <button
                onClick={() => setSelectedCard('personal')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  selectedCard === 'personal' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                PERSONAL CARD
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 space-y-4 shadow-inner relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono tracking-widest uppercase text-neutral-500">
                  {selectedCard === 'pro' ? 'BOUND TO WORK PROFILE' : 'BOUND TO PERSONAL PROFILE'}
                </span>
                <p className="text-base font-bold text-white tracking-wide mt-1">
                  {selectedCard === 'pro' ? 'Isaac Salasiban' : 'Isaac S.'}
                </p>
                <p className="text-xs text-neutral-400">
                  {selectedCard === 'pro' ? 'Systems Architect' : 'Personal Channels & Media'}
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {selectedCard === 'pro' ? 'PRO-PASS' : 'PERS-PASS'}
              </span>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono text-neutral-400">
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                {selectedCard === 'pro' ? '💼 Corporate vCard' : '📸 Instagram Deep-Link'}
              </span>
              <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">
                {selectedCard === 'pro' ? '🔗 LinkedIn Direct' : '💬 WhatsApp Direct'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono px-1">
            <span>ISOLATION: LOCKED</span>
            <span>1 CARD = 1 PROFILE</span>
          </div>
        </div>

        {/* Portal Entry CTAs (Explicit Login & Signup Paths) */}
        <div id="portals" className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          <div className="p-6 bg-white text-black rounded-2xl text-left shadow-2xl space-y-4 border border-white flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-600">Enterprise</span>
              <h3 className="text-lg font-bold">Professional Portal</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">Corporate vCard, LinkedIn routing, and tap telemetry for business networking.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Link 
                href="/portal/professional/login" 
                className="flex-1 py-2.5 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl text-center hover:bg-neutral-800 transition-all"
              >
                Log In
              </Link>
              <Link 
                href="/portal/professional/login" 
                className="flex-1 py-2.5 bg-neutral-200 text-black font-bold text-xs uppercase tracking-wider rounded-xl text-center hover:bg-neutral-300 transition-all"
              >
                Sign Up
              </Link>
            </div>
          </div>

          <div className="p-6 bg-neutral-950 border border-neutral-800 text-white rounded-2xl text-left shadow-2xl space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-500">Consumer</span>
              <h3 className="text-lg font-bold">Personal Portal</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">Social media deep links, personal messaging channels, and payment QR codes.</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Link 
                href="/portal/personal/login" 
                className="flex-1 py-2.5 bg-neutral-900 border border-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl text-center hover:border-neutral-700 transition-all"
              >
                Log In
              </Link>
              <Link 
                href="/portal/personal/login" 
                className="flex-1 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl text-center hover:bg-neutral-200 transition-all"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 1:1 Architecture Section */}
      <section id="architecture" className="w-full max-w-5xl mx-auto px-6 py-16 border-t border-neutral-900 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4 text-left">
            <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">System Guarantee</span>
            <h2 className="text-3xl font-bold tracking-tight">Purpose-Built Identity Segregation</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Traditional multi-profile cards cause accidental sharing of personal social accounts during business meetings. PULSE strictly enforces a single-identity binding per physical card.
            </p>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Your Professional Card connects exclusively to corporate identity endpoints. Your Personal Card handles your private digital footprint—keeping your contacts organized with zero risk of exposure.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">🎴</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Dedicated Pass</h4>
              <p className="text-[11px] text-neutral-500">1 physical NFC card strictly equals 1 digital profile.</p>
            </div>
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">🔒</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Leakage</h4>
              <p className="text-[11px] text-neutral-500">Completely separated authentication environments.</p>
            </div>
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">⚡</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Deep Linking</h4>
              <p className="text-[11px] text-neutral-500">Triggers native mobile apps instantly upon tap.</p>
            </div>
            <div className="p-5 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
              <span className="text-xl">🛡️</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hardware Lock</h4>
              <p className="text-[11px] text-neutral-500">Instantly disable lost cards right from your portal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Architecture Spec */}
      <section id="hardware" className="w-full max-w-5xl mx-auto px-6 py-16 z-10">
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 md:p-12 text-left relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-md">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Hardware Pass Spec</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Matte Black NFC Cards</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Industrial-grade matte black finish built with embedded high-frequency NFC antennas and printed laser QR fallbacks for complete smartphone compatibility.
            </p>
            <div className="pt-2 flex items-center gap-6 text-xs text-neutral-300 font-mono">
              <span>✓ BATTERYLESS</span>
              <span>✓ INSTANT TELEMETRY</span>
            </div>
          </div>

          <div className="w-full max-w-xs aspect-[1.586/1] bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between relative group hover:border-neutral-700 transition-all">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-400">PULSE PASS</span>
              </div>
              <svg className="w-4 h-4 fill-none stroke-current stroke-2 text-neutral-300" viewBox="0 0 24 24">
                <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
              </svg>
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
          </div>
        </div>
      </footer>

    </main>
  );
}